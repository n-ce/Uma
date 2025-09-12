const piped_instances = 'https://raw.githubusercontent.com/TeamPiped/documentation/refs/heads/main/content/docs/public-instances/index.md';


function getInstanceUrls(text: string) {
  const lines = text.split('\n');
  const instanceUrls: string[] = [];
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

  console.log(
    instanceUrls.length ?
      'Extracted Piped Instances from RAW' :
      'Failed to Extract Piped Instances from RAW'
  );
  return instanceUrls;
}


async function getSuggestions(i: string): Promise<[number, string]> {
  const t = performance.now();

  return fetch(i + '/opensearch/suggestions?query=time')
    .then(_ => _.json())
    .then(data => {
      if (data && Array.isArray(data) && data[1]?.length) {
        const score = Math.floor(1e5 / (performance.now() - t));
        return [score, i] as [number, string];
      } else throw new Error();
    })
    .catch(() => [0, i]);
}

const getLivingInstances = (instanceArray: string[]): Promise<string[]> => Promise.all(instanceArray.map(getSuggestions)).then(array =>
  array
    .sort((a, b) => b[0] - a[0])
    .filter((i) => i[0])
    .map(i => i[1] as string)
);



async function getAudioUrl(instance: string): Promise<[string, string]> {
  const audioUrl = await fetch(`${instance}/streams/ic8j13piAhQ`)
    .then(res => res.json())
    .then(data => {
      if (data && 'audioStreams' in data) {
        return data.audioStreams[0].url;
      } else {
        throw new Error(data.error || 'No audio streams found');
      }
    })
    .catch(() => '');

  return [instance, audioUrl];
}

async function proxyTest(i: string, url: string | null): Promise<string | null> {

  if (!url) return '';

  const passed = await fetch(url)
    .then(res => res.status === 200)
    .catch(() => false);

  return passed ? i : '';
}

async function reorderInstancesByProxyTest(instances: string[]): Promise<[string[], boolean, [string, string][]]> {
  console.log('Initiating proxy test to reorder instances...');
  const audioUrls = await Promise.all(instances.map(getAudioUrl));
  const proxyResults = await Promise.all(audioUrls.map(([instance, url]) => proxyTest(instance, url)));

  instances = instances.sort((a, b) => {
    const aPassed = proxyResults.includes(a);
    const bPassed = proxyResults.includes(b);

    if (aPassed && !bPassed) return -1;
    if (!aPassed && bPassed) return 1;
    return 0;
  });

  return [instances, proxyResults.length > 0,
    audioUrls
      .filter(v => v[1])
  ];
}



export default async function() {

  console.log('Initiate Piped Instance RAW Fetching...');

  return fetch(piped_instances)
    .then(_ => _.text())
    .then(getInstanceUrls)
    .then(instances => [
      ...instances.slice(1),
      'https://pol1.piapi.ggtyler.dev',
      'https://nyc1.piapi.ggtyler.dev',
      'https://cal1.piapi.ggtyler.dev',
    ])
    .then(getLivingInstances)
    .then(reorderInstancesByProxyTest)
}
