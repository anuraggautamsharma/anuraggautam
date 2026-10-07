import { permanentRedirect } from 'next/navigation'

/** /newsletter is a memorable alias for /subscribe (PLAN_V3 §2). Kept out of the sitemap. */
export default function NewsletterAlias() {
  permanentRedirect('/subscribe')
}
