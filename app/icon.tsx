import { ImageResponse } from 'next/og'
import { summitMarkSvg } from '@/components/layout/SummitMark'

// The summit mark, ink on sunrise-500, at every size the browser and the web manifest ask for:
// /icon/32, /icon/192, /icon/512. On orange the sunrise dot turns paper so it still reads.
const SIZES = [32, 192, 512] as const
const BG = '#F86A00'
const MARK = `data:image/svg+xml;base64,${Buffer.from(summitMarkSvg('#0E1D15', '#F7F2E8')).toString('base64')}`

export function generateImageMetadata() {
  return SIZES.map((s) => ({ id: String(s), size: { width: s, height: s }, contentType: 'image/png' }))
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const px = Number(await id) || 32
  // The favicon nearly fills its square; larger icons keep a safe zone for maskable crops.
  const mark = px <= 32 ? Math.round(px * 0.84) : Math.round(px * 0.58)
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image */}
        <img src={MARK} width={mark} height={mark} alt="" />
      </div>
    ),
    { width: px, height: px },
  )
}
