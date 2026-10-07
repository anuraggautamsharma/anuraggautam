import { logoSize, type Tool } from '@/lib/tools'

/** One official tool mark, optically sized. The name is the alt text (and a tooltip). */
export function ToolLogo({ tool, base = 26, className }: { tool: Tool; base?: number; className?: string }) {
  const { w, h } = logoSize(tool, base)
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand SVGs, served as-is (no optimisation needed)
    <img
      src={tool.src}
      alt={tool.name}
      title={`${tool.name} · ${tool.role}`}
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ inlineSize: w, blockSize: h }}
    />
  )
}
