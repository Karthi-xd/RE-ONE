// Retro desktop-icon glyphs, ported 1:1 from the original static
// public/main-desktop.html ICON_GLYPHS map so the look stays identical.

export type GlyphId =
  | 'folder'
  | 'computer'
  | 'recycle'
  | 'docs'
  | 'rag'
  | 'notepad'
  | 'paint'
  | 'calculator'

export function Glyph({ id, className }: { id: GlyphId; className?: string }) {
  switch (id) {
    case 'folder':
      return (
        <svg viewBox="0 0 40 34" className={className}>
          <path d="M2 8 L2 30 L38 30 L38 10 L18 10 L15 6 L2 6 Z" fill="#f6c453" stroke="#8a5a00" strokeWidth={1} />
          <path d="M2 8 L2 30 L38 30 L38 10 L2 10 Z" fill="#ffe07a" stroke="#8a5a00" strokeWidth={1} />
        </svg>
      )
    case 'computer':
      return (
        <svg viewBox="0 0 40 34" className={className}>
          <rect x={4} y={4} width={32} height={20} rx={1} fill="#c9d9ea" stroke="#4a5a6a" />
          <rect x={7} y={7} width={26} height={14} fill="#2a6ac1" />
          <rect x={12} y={26} width={16} height={4} fill="#9aa9b8" stroke="#4a5a6a" />
        </svg>
      )
    case 'recycle':
      return (
        <svg viewBox="0 0 40 34" className={className}>
          <path d="M12 10 L28 10 L26 30 L14 30 Z" fill="#e8ecef" stroke="#556" strokeWidth={1} />
          <rect x={9} y={6} width={22} height={4} fill="#b9c2cc" stroke="#556" />
          <rect x={16} y={2} width={8} height={4} fill="#b9c2cc" stroke="#556" />
        </svg>
      )
    case 'docs':
      return (
        <svg viewBox="0 0 40 34" className={className}>
          <path d="M9 2 L25 2 L31 8 L31 32 L9 32 Z" fill="#fefefe" stroke="#5578b0" />
          <path d="M25 2 L25 8 L31 8 Z" fill="#c8d8f0" />
          <line x1={12} y1={14} x2={27} y2={14} stroke="#8aa4cc" />
          <line x1={12} y1={19} x2={27} y2={19} stroke="#8aa4cc" />
          <line x1={12} y1={24} x2={27} y2={24} stroke="#8aa4cc" />
        </svg>
      )
    case 'rag':
      return (
        <svg viewBox="0 0 40 34" className={className}>
          <circle cx={17} cy={14} r={10} fill="#dcebff" stroke="#0a246a" strokeWidth={2} />
          <line x1={24} y1={21} x2={34} y2={31} stroke="#0a246a" strokeWidth={4} strokeLinecap="round" />
          <circle cx={17} cy={14} r={5} fill="#3a6ea5" />
        </svg>
      )
    case 'notepad':
      return (
        <svg viewBox="0 0 40 34" className={className}>
          <rect x={7} y={2} width={26} height={30} fill="#fffdf2" stroke="#8a7a3a" />
          <rect x={7} y={2} width={26} height={6} fill="#f6d76a" stroke="#8a7a3a" />
          <line x1={11} y1={14} x2={29} y2={14} stroke="#c9b98a" />
          <line x1={11} y1={19} x2={29} y2={19} stroke="#c9b98a" />
          <line x1={11} y1={24} x2={24} y2={24} stroke="#c9b98a" />
        </svg>
      )
    case 'paint':
      return (
        <svg viewBox="0 0 40 34" className={className}>
          <path
            d="M20 3c-9 0-16 6-16 13 0 5 4 8 8 8 2 0 2-2 1-3-1-2 0-3 2-3h5c5 0 9-4 9-9 0-3-4-6-9-6Z"
            fill="#e8ecef"
            stroke="#556"
          />
          <circle cx={14} cy={11} r={2} fill="#e05252" />
          <circle cx={20} cy={8} r={2} fill="#529be0" />
          <circle cx={26} cy={11} r={2} fill="#e0d652" />
          <circle cx={14} cy={18} r={2} fill="#6bc36b" />
        </svg>
      )
    case 'calculator':
      return (
        <svg viewBox="0 0 40 34" className={className}>
          <rect x={9} y={1} width={22} height={32} rx={2} fill="#e8ecef" stroke="#556" />
          <rect x={12} y={4} width={16} height={7} fill="#c8e0c8" stroke="#556" />
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={12 + col * 5.5}
                y={14 + row * 4.5}
                width={4}
                height={3.2}
                fill="#fff"
                stroke="#899"
              />
            )),
          )}
        </svg>
      )
  }
}
