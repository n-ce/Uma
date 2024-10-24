import { writeFileSync, readFileSync } from 'fs';

const allPipedInstancesUrl = 'https://raw.githubusercontent.com/wiki/TeamPiped/Piped/Instances.md';
const invidious_instances = JSON.parse(readFileSync('./invidious.json', 'utf8'));
const hyperpipe_instances = JSON.parse(readFileSync('./hyperpipe.json', 'utf8'));
const unified_instances = {};

for (const instance in invidious_instances)
  await fetch(invidious_instances[instance] + '/api/v1/search/suggestions?q=the')
    .then(res => res.json())
    .then(data => {
      if (data?.suggestions?.length)
        unified_instances[instance] = invidious_instances[instance];
      else throw new Error();
    })
    .catch(() => '');


async function getSuggestions(i: string) {
  const t = performance.now();
  let array = [0, ''];

  await fetch(i + '/opensearch/suggestions?query=the')
    .then((res) => res.json())
    .then((data) => {
      const score = 1 / (performance.now() - t);
      if (data.length) array = [score, i];
      else throw new Error();
    })
    .catch(() => [0, '']);

  return array;
}

fetch(allPipedInstancesUrl)
  .then(res => res.text())
  .then(text => text.split('--- | --- | --- | --- | ---')[1])
  .then(table => table.split('\n'))
  .then(instances => instances.map((instance) => instance.split(' | ')[1]))
  .then(instances => {
    instances.shift();

    const dynamic_instances: {
      piped: string[];
      invidious: string[];
      hyperpipe: string[];
      unified: number;
    } = {
      piped: [],
      invidious: ['https://invi.susurrando.com', 'https://invidious.jing.rocks'],
      hyperpipe: [],
      unified: 0,
    };

    Promise.all(
      instances
        .filter(i => i !== 'https://api.piped.private.coffee')
        .map(getSuggestions))
      .then((array) => {
        array
          .sort((a, b) => <number>b[0] - <number>a[0])
          .filter((i) => i[0])
          .forEach((i) => {
            if (i[1] in unified_instances) {
              dynamic_instances.unified++;
              dynamic_instances.piped.unshift(i[1] as string);
              dynamic_instances.invidious.unshift(unified_instances[i[1]]);

              if (i[1] in hyperpipe_instances)
                dynamic_instances.hyperpipe.unshift(
                  hyperpipe_instances[i[1]] as string
                );
            }
            else dynamic_instances.piped.push(i[1] as string);
          });
        
        console.log(dynamic_instances);
        writeFileSync(
          'dynamic_instances.json',
          JSON.stringify(dynamic_instances, null, 4)
        );
      }
      );

  });

