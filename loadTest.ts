export async function loadTest(i: string): Promise<string | null> {
  
  const url = await fetch(`${i}/api/v1/videos/GemKqzILV4w`)
    .then(res => res.json())
    .then(data => {
      console.log(i, `data: ${Boolean(data.adaptiveFormats.length)}`);
      if (data && 'adaptiveFormats' in data)
        return data;
      else throw new Error(data.error);
    })
    .then(
      (data: {
        adaptiveFormats: {
          url: string,
          type: string
        }[]
      }) => (data.adaptiveFormats
        .filter((f) => f.type.startsWith('audio'))
      [0].url)
    )
  .catch(() => '');

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
