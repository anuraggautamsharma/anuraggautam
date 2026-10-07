// Portrait (4:5) art-direction crops for the full-bleed photos (SPEC_V2 §6).
// Run once: `node scripts/crops.mjs`. The output in assets/nature/m/ is committed.
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'assets/nature')
const out = path.join(dir, 'm')

/** left = crop origin in source pixels; the crop keeps the source's full height. */
const CROPS = [
  { id: 'basecamp-hero', width: 1080, height: 1350, left: 852 },
  { id: 'terrain-fog', width: 1280, height: 1600, left: 32 },
  { id: 'summit-golden', width: 1280, height: 1600, left: 80 },
]

await mkdir(out, { recursive: true })

for (const c of CROPS) {
  const src = path.join(dir, `${c.id}.jpg`)
  const meta = await sharp(src).metadata()
  if (c.left + c.width > meta.width || c.height > meta.height) {
    throw new Error(`${c.id}: crop ${c.width}x${c.height}+${c.left} exceeds ${meta.width}x${meta.height}`)
  }
  const top = Math.round((meta.height - c.height) / 2)
  const dest = path.join(out, `${c.id}-m.jpg`)
  const info = await sharp(src)
    .extract({ left: c.left, top, width: c.width, height: c.height })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(dest)
  console.log(`${path.relative(root, dest)}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`)
}
