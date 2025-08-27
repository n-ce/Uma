// @ts-ignore
import { writeFileSync } from 'fs';
import test_invidious from "./test_invidious.ts";
import test_piped from './test_piped.ts';
import { gethp } from './hyperpipe.ts';


const jiosaavn_instances = [
  'https://saavn-sigma.vercel.app',
  'https://saavn-ytify.vercel.app',
  'https://jiosavan-ytify.vercel.app'
];

async function ivProxyTest(instance: string, url: string) {
  const _url = new URL(url);
  const newUrl = url.replace(_url.origin, instance);
  const passed = await fetch(newUrl)
    .then(res => res.status === 200)
    .catch(() => false);

  return passed ? instance : '';
}

async function reorderByIvProxyTest(iv: string[], audioUrls: string[]) {
  console.log('Initiating reorder iv proxy test');
  const promises = audioUrls.flatMap(a => iv.map(i => ivProxyTest(i, a)));
  const results = await Promise.all(promises);
  const successfulInstances = new Set(results.filter(r => r !== ''));

  iv.sort((a, b) => {
    const aPassed = successfulInstances.has(a);
    const bPassed = successfulInstances.has(b);

    if (aPassed && !bPassed) return -1;
    if (!aPassed && bPassed) return 1;
    return 0;
  });

  return iv;
}


test_piped()
  .then(async res => {
    const [pi, usePiped, audioUrls] = res;
    const [iv, useIv] = await test_invidious();

    let sortedIv = iv;
    if (usePiped) {
      console.log('Piped is able to achieve playback, reordering invidious by proxying capability');
      sortedIv = await reorderByIvProxyTest(iv, audioUrls);
    }

    console.log('Initiating Hyperpipe test')
    const hp = await gethp();
    const data = {
      piped: pi,
      invidious: sortedIv,
      hyperpipe: hp,
      jiosaavn: jiosaavn_instances[Math.floor(Math.random() * jiosaavn_instances.length)],
      health: usePiped ? 'P' : useIv ? 'I' : 'N'
    };
    console.log(data);
    writeFileSync('list.json', JSON.stringify(data, null, 4));
  });
