// @ts-ignore
import { readFile } from 'fs/promises';


async function getSuggestions(i: string): Promise<[number, string]> {
  const t = performance.now();

  return fetch(i + '/api/v1/search/suggestions?q=time')
    .then(_ => _.json())
    .then(data => {
      if (data?.suggestions?.length) {
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
  const url = await fetch(`${instance}/api/v1/videos/GemKqzILV4w`)
    .then(res => res.json())
    .then(data => {
      console.log(instance, `data: ${Boolean(data.adaptiveFormats.length)}`);
      if (data && 'adaptiveFormats' in data) {
        return data.adaptiveFormats.filter((f: { type: string; }) => f.type.startsWith('audio'))[0].url;
      } else {
        throw new Error(data.error);
      }
    })
    .catch(() => '');

  return [instance, url];
}


async function loadTest(i: string, url: string): Promise<string | null> {

  if (!url) return '';

  const curl = new URL(url);
  const origin = curl.origin;
  const proxiedUrl = url.replace(origin, i) + '&host=' + origin.slice(8);
  console.log(proxiedUrl);
  const passed = await fetch(proxiedUrl)
    .then(res => res.status === 200)
    .catch(() => false);

  return passed ? i : '';
}




async function reorderByLoadTest(instances: string[]): Promise<[string[], boolean, string[]]> {
  console.log('Initiating load test to reorder instances...');
  const audioUrls = await Promise.all(instances.map(getAudioUrl));
  const loadTestResults = await Promise.all(audioUrls.map(([instance, url]) => loadTest(instance, url)));

  instances = instances.sort((a, b) => {
    const aPassed = loadTestResults.includes(a);
    const bPassed = loadTestResults.includes(b);
    if (aPassed && !bPassed) return -1;
    if (!aPassed && bPassed) return 1;
    return 0;
  });

  return [instances, loadTestResults.length > 0, audioUrls.map(v => v[1]).filter(v => v)];
}

export default async function() {
  console.log('Initiating Invidious instance test');
  return await readFile('./invidious.json', 'utf8')
    .then(_ => JSON.parse(_))
    .then(getLivingInstances)
    .then(reorderByLoadTest)
}
