// @ts-ignore
import { writeFileSync } from 'fs';
import test_invidious from "./test_invidious.ts";
// import test_piped from './test_piped.ts';
// import test_hyperpipe from './test_hyperpipe.ts';
// import test_cobalt from './test_cobalt.ts';
import encoder2 from './encoder2.ts';

/*
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
*/

test_invidious()
  .then(async res => {

    // let shouldUsePiped = false;

    // if (usePiped) {
    //   console.log('Piped is able to achieve playback, reordering invidious by proxying capability');
    //   const ordered = await reorderByIvProxyTest(iv, audioUrls);

    //   console.log(ordered);

    //   if (ordered.length) {
    //     const [orderedIv, orderedPi] = ordered;
    //     if (orderedPi.length) {
    //       orderedPi.forEach(e => {
    //         moveElementToFront(pi, e);
    //       });
    //       shouldUsePiped = true;

    //       if (orderedIv.length)
    //         iv.splice(0, iv.length, ...orderedIv);
    //     }

    //   }

    // }


    // console.log('Initiating Hyperpipe Test...')
    // const hp = await test_hyperpipe();

    const data = res.map((i: string) => i.slice(8));
    //  status: shouldUsePiped ? 'P' : useIv ? 'I' : 'N'
    /*
    console.log('Fetching Cobalt List...')
    const cb = await test_cobalt();
    if (cb.length)
      data.cb = cb[0];
    */
    console.log(data);
    
    if (data.length > 2)
      writeFileSync('iv.txt', encoder2(data.join(',')).compressedString);
    
  });


function moveElementToFront(arr: string[], elementToMove: string) {
  const index = arr.indexOf(elementToMove);
  if (index > -1) {
    const [removedElement] = arr.splice(index, 1);
    arr.unshift(removedElement);
  }
  return arr;
}
