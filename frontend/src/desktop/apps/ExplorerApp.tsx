import shared from './shared.module.css'

export const YEARS = ['2015', '2016', '2017', '2018', '2019', '2020']

interface ExplorerAppProps {
  year: string | null
  onOpenYear: (year: string) => void
  onOpenRag: (year?: string) => void
  onOpenMemory: (year: string) => void
}

export default function ExplorerApp({ year, onOpenYear, onOpenRag, onOpenMemory }: ExplorerAppProps) {
  return (
    <>
      <div className={shared.menubar}>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Favorites</span>
        <span>Tools</span>
        <span>Help</span>
      </div>
      <div className={shared.toolbar}>
        <button className={shared.winBtn} style={{ padding: '3px 8px' }}>
          &#8592; Back
        </button>
        <button className={shared.winBtn} style={{ padding: '3px 8px' }}>
          &#8594;
        </button>
        <div className={shared.addressbar}>
          <span>&#128193;</span>
          <input type="text" readOnly value={`C:\\Historical Archive\\${year || 'My Documents'}`} />
        </div>
      </div>
      <div className={shared.winBody}>
        <div className={shared.explorerBody}>
          <div className={shared.explorerSidebar}>
            <h3>Folders</h3>
            <ul>
              {YEARS.map((y) => (
                <li key={y} className={y === year ? shared.active : ''} onClick={() => onOpenYear(y)}>
                  {y}
                </li>
              ))}
            </ul>
            <h3>Also try</h3>
            <ul>
              <li onClick={() => onOpenRag()}>Historical RAG</li>
            </ul>
          </div>
          <div className={shared.explorerMain}>
            {!year && <div className={shared.emptyFolderMsg}>This folder is empty. Try a year folder or Historical RAG.</div>}
            {year && (
              <div
                className={shared.fileItem}
                style={{ cursor: 'pointer' }}
                onDoubleClick={() => onOpenMemory(year)}
              >
                <div className={shared.fileGlyph}>📔</div>
                <div className={shared.fileName}>Enter {year}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={shared.statusbar}>
        <span>{year ? '1 item' : '0 items'}</span>
      </div>
    </>
  )
}