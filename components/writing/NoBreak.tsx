/**
 * Keeps hyphenated compounds ("go-to-market", "Time-to-Proof") on one line in big
 * display titles, so a balanced title never ends a line on "go-".
 */
export function NoBreakHyphens({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\S+-\S+)/).map((part, i) =>
        i % 2 ? (
          <span key={i} style={{ whiteSpace: 'nowrap' }}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}
