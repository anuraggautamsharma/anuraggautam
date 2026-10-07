import { redirect } from 'next/navigation'

// /links is the memorable link-in-bio alias. Temporary (307), so the alias can become its
// own page later without browsers holding on to a cached permanent redirect.
export default function LinksPage(): never {
  redirect('/start')
}
