// @ts-ignore
import { writeFileSync } from 'fs';
import test_invidious from "./test_invidious.ts";
import test_piped from './test_piped.ts';
import test_hyperpipe from './test_hyperpipe.ts';


const jiosaavn_instances = [
  'https://saavn-sigma.vercel.app',
  'https://saavn-ytify.vercel.app',
  'https://jiosavan-ytify.vercel.app'
];

async function ivProxyTest(instance: string, arr: [string, string]) {
  const [piIns, url] = arr;
  const _url = new URL(url);
  const newUrl = url.replace(_url.origin, instance);
  const passed = await fetch(newUrl)
    .then(res => res.status === 200)
    .catch(() => false);

  return passed ? [piIns, instance] : [];
}

async function reorderByIvProxyTest(iv: string[], audioUrls: [string, string][]) {
  console.log('Initiating reorder iv proxy test');
  const promises = audioUrls.flatMap(a => iv.map(i => ivProxyTest(i, a)));

  const results = (await Promise.all(promises)).filter(s => s.length);

  const ivS = results.map(s => s[1]);
  const piS = results.map(s => s[0]);

  iv = iv.sort((a, b) => {
    const aPassed = ivS.includes(a);
    const bPassed = ivS.includes(b);

    if (aPassed && !bPassed) return -1;
    if (!aPassed && bPassed) return 1;
    return 0;
  });


  return results.length ? [iv, piS] : [];
}


test_piped()
  .then(async res => {
    const [pi, usePiped, audioUrls] = res;
    const [iv, useIv] = await test_invidious();


    let shouldUsePiped = false;

    if (usePiped) {
      console.log('Piped is able to achieve playback, reordering invidious by proxying capability');
      const ordered = await reorderByIvProxyTest(iv, audioUrls);

      console.log(ordered);

      if (ordered.length) {
        const [orderedIv, orderedPi] = ordered;
        if (orderedPi.length) {
          orderedPi.forEach(e => {
            moveElementToFront(pi, e);
          });
          shouldUsePiped = true;

          if (orderedIv.length)
            iv.splice(0, iv.length, ...orderedIv);
        }

      }

    }


    console.log('Initiating Hyperpipe test')
    const hp = await test_hyperpipe();
    const data = {
      piped: pi,
      invidious: iv,
      hyperpipe: hp,
      jiosaavn: jiosaavn_instances[Math.floor(Math.random() * jiosaavn_instances.length)],
      cobalt: 'https://cobalt-api.meowing.de',
      status: shouldUsePiped ? 'P' : useIv ? 'I' : 'N'
    };
    console.log(data);
    writeFileSync('list.json', JSON.stringify(data, null, 4));
  });


function moveElementToFront(arr: string[], elementToMove: string) {
  const index = arr.indexOf(elementToMove);
  if (index > -1) {
    const [removedElement] = arr.splice(index, 1);
    arr.unshift(removedElement);
  }
  return arr;
}
