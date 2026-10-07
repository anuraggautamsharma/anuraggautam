import sitemap from '@/app/sitemap'
import { authorised, daysBetween, todayIST } from '@/lib/cron'
import { submitToIndexNow } from '@/lib/indexnow'

export const dynamic = 'force-dynamic'

const RECENT_DAYS = 2

const day = (d: string | Date | undefined) => (d instanceof Date ? d.toISOString().slice(0, 10) : d?.slice(0, 10))

/**
 * Daily from vercel.json at 04:00 UTC: pings IndexNow with every sitemap URL whose lastmod is
 * from the last two days, so a new Field Note reaches Bing by the next morning. `?all=1` sends
 * the whole sitemap. Manual run:
 *   curl -H "Authorization: Bearer $CRON_SECRET" "https://anuraggautam.com/api/cron/indexnow?all=1"
 */
export async function GET(req: Request) {
  if (!authorised(req)) return Response.json({ reason: 'unauthorised' }, { status: 401 })

  const all = new URL(req.url).searchParams.get('all') === '1'
  const today = todayIST()
  const urls = (await sitemap())
    .filter((e) => {
      const d = day(e.lastModified)
      return all || (d !== undefined && daysBetween(d, today) <= RECENT_DAYS)
    })
    .map((e) => e.url)

  const status = await submitToIndexNow(urls)
  // 200 and 202 both mean accepted (202: the key is still being validated).
  return Response.json({ submitted: urls, indexnow: status }, { status: status < 300 ? 200 : 502 })
}
