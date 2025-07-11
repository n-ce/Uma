const instances = [
  "https://hpapi.ngn.tf",
  "https://hyperpipeapi.pfcd.me",
  "https://pol1.hpapi.ggtyler.dev",
  "https://cal1.hpapi.ggtyler.dev",
  "https://nyc1.hpapi.ggtyler.dev",
  "https://musicapi.adminforge.de",
  "https://musicapi.reallyaweso.me",
  "https://hyperpipe-api.lunar.icu",
  "https://hyperpipeapi.drgns.space",
  "https://hyperpipeapi.ducks.party",
  "https://hyperpipeapi.onrender.com",
  "https://hp-proxy.iqbalrifai.eu.org",
  "https://hyperpipeapi.darkness.services",
  "https://hyperpipeapi.frontendfriendly.xyz",
  "https://hyperpipebackend.eu.projectsegfau.lt",
  "https://hyperpipebackend.us.projectsegfau.lt",
  "https://hyperpipebackend.in.projectsegfau.lt"
];

export async function gethp() {

  const hp = async (i: string) => {
    const t = performance.now();

    return fetch(`${i}/channel/UCERrDZ8oN0U_n9MphMKERcg`)
      .then(_ => _.json())
      .then(data => {
        const score = Math.floor(1e5 / (performance.now() - t));
        console.log(`${i} - ${score}`);
        if (data.playlistId?.length)
          return [score, i];
        else throw new Error();
      })
      .catch(() => [0, i]);
  }

  const data = await Promise
    .all(instances.map(hp))
    .then(array => array
      .sort((a, b) => <number>b[0] - <number>a[0])
      .filter((i) => i[0])
    );

  return data[0][1];

}
