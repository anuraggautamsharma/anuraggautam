import 'server-only'
import { SITE_URL } from '@/lib/site'

/**
 * IndexNow tells Bing, Yandex, Seznam and Naver (and, through Bing, ChatGPT search and Copilot)
 * that a URL changed. The key is public by design: it is proved by public/<key>.txt.
 */
export const INDEXNOW_KEY = '048c08ed6a4bb2557ed4be70db5a075b'

export async function submitToIndexNow(urls: string[]): Promise<number> {
  if (!urls.length) return 204
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls.slice(0, 10_000),
    }),
  })
  return res.status
}
