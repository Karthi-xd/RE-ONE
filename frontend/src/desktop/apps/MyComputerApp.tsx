import shared from './shared.module.css'
import { YEARS } from './ExplorerApp'

interface MyComputerAppProps {
  onOpen: (id: string) => void
}

export default function MyComputerApp({ onOpen }: MyComputerAppProps) {
  return (
    <>
      <div className={shared.menubar}>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Help</span>
      </div>
      <div className={shared.winBody}>
        <div className={shared.explorerMain}>
          <div className={shared.fileItem} style={{ cursor: 'pointer' }} onDoubleClick={() => onOpen('mydocs')}>
            <div className={shared.fileGlyph}>📁</div>
            <div className={shared.fileName}>My Documents</div>
          </div>
          {YEARS.map((y) => (
            <div className={shared.fileItem} style={{ cursor: 'pointer' }} key={y} onDoubleClick={() => onOpen(y)}>
              <div className={shared.fileGlyph}>📁</div>
              <div className={shared.fileName}>{y} Archive</div>
            </div>
          ))}
          <div className={shared.fileItem} style={{ cursor: 'pointer' }} onDoubleClick={() => onOpen('rag')}>
            <div className={shared.fileGlyph}>🔍</div>
            <div className={shared.fileName}>Historical RAG</div>
          </div>
        </div>
      </div>
      <div className={shared.statusbar}>
        <span>{YEARS.length + 2} object(s)</span>
      </div>
    </>
  )
}
