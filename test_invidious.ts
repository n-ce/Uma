// @ts-ignore
import { readFile } from 'fs/promises';


async function getMixesTest(i: string): Promise<[number, string]> {
  const t = performance.now();

  return fetch(`${i}/api/v1/mixes/RDGemKqzILV4w`)
    .then(_ => _.json())
    .then(data => {
      if (data?.videos?.length) {
        const score = Math.floor(1e5 / (performance.now() - t));
        return [score, i] as [number, string];
      } else throw new Error();
    })
    .catch(() => [0, i]);
}

const getLivingInstances = (instanceArray: string[]): Promise<string[]> => Promise.all(instanceArray.map(getMixesTest)).then(array =>
  array
    .filter((i) => i[0])
    .sort((a, b) => b[0] - a[0])
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

  if (!url) {
    console.log(`loadTest: ${i} - Skipped (no audio URL)`);
    return '';
  }

  const curl = new URL(url);
  const origin = curl.origin;
  const proxiedUrl = url.replace(origin, i) + '&host=' + origin.slice(8);

  const passed = await fetch(proxiedUrl)
    .then(res => res.status === 200)
    .catch(() => false);

  console.log(`loadTest: ${i} - ${passed ? 'passed' : 'failed'} proxy test`);

  return passed ? i : '';
}




async function reorderByLoadTest(instances: string[]): Promise<string[]> {
  console.log('Initiating load test to reorder instances...');
  console.log(instances);
  const audioUrls = await Promise.all(instances.map(getAudioUrl));
  const loadTestResults = await Promise.all(audioUrls.map(([instance, url]) => loadTest(instance, url)));


  instances = instances.sort((a, b) => {
    const aLoadTestPassed = loadTestResults.includes(a);
    const bLoadTestPassed = loadTestResults.includes(b);

    // Prioritize instances that passed loadTest
    if (aLoadTestPassed && !bLoadTestPassed) return -1;
    if (!aLoadTestPassed && bLoadTestPassed) return 1;

    const aAudioUrl = audioUrls.find(([inst]) => inst === a)?.[1];
    const bAudioUrl = audioUrls.find(([inst]) => inst === b)?.[1];

    // Then prioritize instances that have a valid audioUrl
    if (!!aAudioUrl && !bAudioUrl) return -1;
    if (!aAudioUrl && !!bAudioUrl) return 1;

    return 0;
  });
  return instances;
}

export default async function() {
  console.log('Initiating Invidious instance test');
  return await readFile('./invidious.json', 'utf8')
    .then(_ => JSON.parse(_))
    .then(getLivingInstances)
    .then(reorderByLoadTest)
}
