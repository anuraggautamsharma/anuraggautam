import Link from 'next/link'
import { chrome, person } from '@/lib/site'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { SummitMark } from './SummitMark'
import { NavLinks } from './NavLinks'
import { HeaderState } from './HeaderState'
import { MobileMenu } from './MobileMenu'
import { ThemeToggle } from './ThemeToggle'
import { SoundToggle } from '@/components/sound/SoundToggle'
import './chrome.css'

/**
 * The floating slab (§3.2). It has no data-mode in the HTML: CSS picks "clear" when the page
 * opens on a photo beat and "paper" otherwise, then HeaderState takes over after hydration.
 */
export function Header() {
  return (
    <header className="site-header" id="site-header">
      <div className="hd-bar">
        <Link href="/" className="hd-brand" aria-label={`${person.name}, home`}>
          <SummitMark size={18} />
          <span className="hd-word" aria-hidden="true">
            {person.name}
          </span>
        </Link>

        <nav className="hd-nav" aria-label="Primary">
          <NavLinks />
        </nav>

        <div className="hd-tools">
          <SoundToggle />
          <ThemeToggle className="hd-theme" />
        </div>

        <ButtonLink href="/contact" size="sm" magnetic className="hd-cta" aria-label={chrome.cta}>
          <span className="hd-cta-full">{chrome.cta}</span>
          <span className="hd-cta-short">{chrome.ctaShort}</span>
        </ButtonLink>

        <MobileMenu />
      </div>
      <HeaderState />
    </header>
  )
}
