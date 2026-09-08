import shared from './shared.module.css'

export default function RecycleBinApp() {
  return (
    <>
      <div className={shared.menubar}>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Help</span>
      </div>
      <div className={shared.winBody}>
        <div className={shared.emptyFolderMsg}>The Recycle Bin is empty.</div>
      </div>
      <div className={shared.statusbar}>
        <span>0 objects</span>
      </div>
    </>
  )
}
