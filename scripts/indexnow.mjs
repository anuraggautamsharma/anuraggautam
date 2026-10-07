// Submits every URL in the live sitemap to IndexNow. Run after a launch or a big change:
//   node scripts/indexnow.mjs
// The daily cron (/api/cron/indexnow) covers new and updated pages after that.
const SITE = 'https://anuraggautam.com'
const KEY = '048c08ed6a4bb2557ed4be70db5a075b'

const xml = await (await fetch(`${SITE}/sitemap.xml`)).text()
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => !/opengraph-image/.test(u))

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
})
console.log(`IndexNow ${res.status} for ${urls.length} URLs`)
