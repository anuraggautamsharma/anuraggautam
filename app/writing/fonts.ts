import { Newsreader } from 'next/font/google'

// Long-form reading. Only the /writing layout imports this module, so its @font-face CSS
// and font files stay out of the marketing pages.
export const serif = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--ff-serif',
  display: 'swap',
  preload: false,
})

// Italic light (the dek): Newsreader first, then a real Times italic sized in globals.css.
export const serifItalic = `${serif.style.fontFamily.split(',')[0]}, 'Newsreader Italic Fallback'`
