import { ImageResponse } from 'next/og'
import { summitMarkSvg } from '@/components/layout/SummitMark'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const MARK = `data:image/svg+xml;base64,${Buffer.from(summitMarkSvg('#0E1D15', '#F7F2E8')).toString('base64')}`

// iOS rounds the corners itself, so the mark sits on a full-bleed sunrise square with a margin.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F86A00' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image */}
        <img src={MARK} width={108} height={108} alt="" />
      </div>
    ),
    size,
  )
}
