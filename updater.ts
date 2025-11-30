// @ts-ignore
import { readFile, writeFile } from 'fs/promises';
// @ts-ignore
import { writeFileSync } from 'fs';
import t from "./test_invidious.ts";
import e from './encoder2.ts';

t().then(async r => {
  const h = await readFile('iv.json', 'utf8').then(JSON.parse).catch(() => []);
  h.push(r);
  if (h.length > 12) h.shift();
  await writeFile('iv.json', JSON.stringify(h));
  const d = [...new Set(h.reverse().flat())].map((i: string) => i.split('//')[1]);
  if (d.length > 1) writeFileSync('iv.txt', e(d.join(',')).compressedString);
});
