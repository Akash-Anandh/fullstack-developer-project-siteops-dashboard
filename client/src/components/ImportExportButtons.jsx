import { useRef, useState } from 'react';

/**
 * Shared Import / Export controls for Sites & Installations toolbars.
 */
export default function ImportExportButtons({
  onImportFile,
  onExport,
  importing = false,
  exporting = false,
  importDisabled = false,
  exportDisabled = false,
  accept = '.xlsx,.xls,.csv',
}) {
  const fileInputRef = useRef(null);
  const [picking, setPicking] = useState(false);
  const importBusy = importing || picking || importDisabled;
  const exportBusy = exporting || exportDisabled;

  function handleImportClick() {
    if (importBusy) return;
    fileInputRef.current?.click();
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPicking(true);
    try {
      await onImportFile(file);
    } finally {
      setPicking(false);
    }
  }

  return (
    <div className="import-export">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        hidden
        onChange={handleFileChange}
      />
      <button
        type="button"
        className="btn btn-ghost"
        onClick={handleImportClick}
        disabled={importBusy}
      >
        {importing ? 'Importing…' : 'Import'}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={onExport}
        disabled={exportBusy}
        title={exportDisabled ? 'Nothing to export' : undefined}
      >
        {exporting ? 'Exporting…' : 'Export xlsx'}
      </button>
    </div>
  );
}
