// @ts-ignore
import { writeFileSync, readFileSync } from 'fs';
import { loadTest } from './loadTest';
import { unifiedTest } from './unifiedTest';
import { hlsTest } from './hlsTest';
import { proxyTest } from './proxyTest';
import { gethp } from './hyperpipe';

const piped_instances = 'https://raw.githubusercontent.com/TeamPiped/documentation/refs/heads/main/content/docs/public-instances/index.md';
const invidious_instances = JSON.parse(readFileSync('./invidious.json', 'utf8'));
const unified_instances = JSON.parse(readFileSync('./unified_instances.json', 'utf8'));
const jiosaavn_instances = [
  'https://saavn-sigma.vercel.app',
  'https://saavn-ytify.vercel.app',
  'https://jiosavan-ytify.vercel.app'
];
const di: Record<'piped' | 'invidious' | 'hyperpipe' | 'proxy' | 'hls', string[]> & {
  jiosaavn: string,
  health: 'U' | 'P' | 'I' | 'N',
} = {
  piped: [],
  hls: [],
  proxy: [],
  invidious: [],
  hyperpipe: [],
  jiosaavn: '',
  health: 'N'
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

    (await Promise.all(pi.map(proxyTest)))
      .filter(h => h)
      .forEach(async i => {
        if (i)
          di.proxy.push(i);
      });


    (await Promise.all(pi.map(hlsTest)))
      .filter(h => h)
      .forEach(async i => {
        if (!i) return;
        if (i in unified_instances) {
          const u = unified_instances[i];
          const isAlive = iv.includes(u);
          if (isAlive) {
            const passed = await unifiedTest(i, u);
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
        if (i) di.invidious.push(i);
      });

    di.hyperpipe = await gethp();
    di.jiosaavn = jiosaavn_instances[Math.floor(Math.random() * jiosaavn_instances.length)];
    // di.health = di.piped.length ? 'U' : di.proxy.length ? 'P' : di.invidious.length ? 'I' : 'N';
    di.health = 'U';
    
    console.log(di);

    if (!di.piped.length) {
      pi
        .filter(i => !di.hls.concat(di.piped).includes(i))
        .forEach(i => di.piped.push(i));
    }

    if (!di.invidious.length)
      di.forEach(i => di.invidious.push(i));

    writeFileSync(
      'dynamic_instances.json',
      JSON.stringify(di, null, 4)
    );
  });
