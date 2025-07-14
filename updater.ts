import { writeFileSync, readFileSync } from 'fs';
import { loadTest } from './loadTest';
import { unifiedTest } from './unifiedTest';
import { hlsTest } from './hlsTest';
import { gethp } from './hyperpipe';

const piped_instances = 'https://raw.githubusercontent.com/TeamPiped/documentation/refs/heads/main/content/docs/public-instances/index.md';
const invidious_instances = JSON.parse(readFileSync('./invidious.json', 'utf8'));
const unified_instances = JSON.parse(readFileSync('./unified_instances.json', 'utf8'));
const jiosaavn_instances = [
  'https://saavn-sigma.vercel.app',
  'https://saavn-ytify.vercel.app',
  'https://jiosavan-ytify.vercel.app'
];
const di: {
  piped: string[],
  invidious: string[],
  hyperpipe: string,
  jiosaavn: string,
  status: number
} = {
  piped: [],
  hls: [],
  invidious: [],
  hyperpipe: '',
  jiosaavn: '',
  status: 1
};

async function getSuggestions(i: string) {
  const t = performance.now();
  const isIV = invidious_instances.includes(i);
  const q = isIV ?
    '/api/v1/search/suggestions?q=the' :
    '/opensearch/suggestions?query=the';

  return fetch(i + q)
    .then(_ => _.json())
    .then(data => {
      const score = Math.floor(1e5 / (performance.now() - t));
      if (isIV ? data?.suggestions?.length : data[0].length)
        return [score, i];
      else throw new Error();
    })
    .catch(() => [0, i]);
}

const getInstances = async (instanceArray: string[]): Promise<string[]> => Promise.all(instanceArray.map(getSuggestions)).then(array =>
  array
    .sort((a, b) => <number>b[0] - <number>a[0])
    .filter((i) => i[0])
    .map(i => i[1] as string)
);

function getInstanceUrls(text: string) {
  const lines = text.split('\n');
  const instanceUrls = [];
  let startParsing = false;

  for (const line of lines) {
    if (line.startsWith('--- | --- | --- | --- | ---')) {
      startParsing = true;
      continue;
    }

    if (startParsing && line.trim() !== '') {
      const parts = line.split('|').map(part => part.trim());
      if (parts.length >= 2) {
        const apiUrl = parts[1];
        if (apiUrl) {
          instanceUrls.push(apiUrl);
        }
      }
    }
  }

  return instanceUrls;
}

fetch(piped_instances)
  .then(r => r.text())
  .then(getInstanceUrls)
  .then(async instances => {
    instances.shift();
    const piped_instances = instances
      .concat([
        'https://pol1.piapi.ggtyler.dev',
        'https://nyc1.piapi.ggtyler.dev',
        'https://cal1.piapi.ggtyler.dev',
      ]);

    const pi = await getInstances(piped_instances);
    const iv = await getInstances(invidious_instances);
    
    (await Promise.all(pi.map(hlsTest)))
      .filter(h => h)
      .forEach(async i => {
        if (i in unified_instances) {
          const u = unified_instances[i];
          const isAlive = iv.includes(u);
          if (isAlive) {
            const passed = await unifiedTest(i,u);
            if (passed) {
              di.piped.push(i);
              di.invidious.push(u);
            }
            else di.hls.push(i);
          }
          else di.hls.push(i);
        }
        else di.hls.push(i);
      });

    (await Promise.all(iv.map(loadTest)))
      .filter(p => p)
      .forEach(i => {
        di.invidious.push(i);
      });
    
    di.hyperpipe = await gethp();
    di.jiosaavn = jiosaavn_instances[Math.floor(Math.random() * jiosaavn_instances.length)];
    
    console.log(di);
    
    if (!di.piped.length) {
      di.status--;
      pi
        .filter(i => !di.hls.concat(di.piped).includes(i))
        .forEach(i => di.piped.push(i));
    }
    
    if (!di.invidious.length) {
      di.status--;
      di.invidious.push(iv[0]);
    }

    writeFileSync(
      'dynamic_instances.json',
      JSON.stringify(di, null, 4)
    );
  });
