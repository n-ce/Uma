export async function proxyTest(i: string): Promise<string | null> {

  const url = await fetch(`${i}/streams/ic8j13piAhQ`)
    .then(res => res.json())
    .then(data => {
      console.log(i, `data: ${'audioStreams' in data}, audioStreams: ${data?.audioStreams?.length || 0}`)
      if (data && 'audioStreams' in data)
        return data;
      else throw new Error(data.error);
    })
    .then(data => data.audioStreams[0].url)
    .catch(() => '');


  if (!url) return '';

  const passed = await fetch(url)
    .then(res => res.status === 200)
    .catch(() => false);

  return passed ? i : '';

}
