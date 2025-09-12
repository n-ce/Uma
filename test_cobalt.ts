const raw = 'https://codeberg.org/kwiat/instances/raw/branch/main/src/lib/input/instances.json';

async function getLink(instance: string): Promise<string | undefined> {

  const id = 'https://youtu.be/tIJVUXICI1c';
  let dl = '';
  await fetch(instance, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: id,
      downloadMode: 'audio',
      audioFormat: 'opus',
      filenameStyle: 'basic'
    })
  })
    .then(_ => _.json())
    .then(_ => {
      if ('url' in _)
        dl = instance;
      else throw new Error(_.error.code);
    })
    .catch(console.error);

  return dl;

}


export default () =>
  fetch(raw)
    .then(res => res.json())
    .then(async data => {
      console.log('Start Cobalt Testing...')
      const instances = data.slice(1).map(_ => 'https://' + _[1]);
      const promises = Promise.all(instances.map(getLink));
      return (await promises).filter(Boolean);
    });

