const instances = [
  "https://hpapi.ngn.tf",
  "https://hpapi.ggtyler.dev",
  "https://hyperpipeapi.pfcd.me",
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
        const score = 1 / (performance.now() - t);
        if (data.playlistId)
          return [score, i];
        else throw new Error();
      })
      .catch(() => [0, '']);
  }

  const data = await Promise
    .all(instances.map(hp))
    .then(array => array
      .sort((a, b) => <number>b[0] - <number>a[0])
      .filter((i) => i[0])
    );

  return data[0][1];

}