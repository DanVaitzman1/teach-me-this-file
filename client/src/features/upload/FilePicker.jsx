import { useState } from 'react'

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp'

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Click-to-choose or drag-and-drop area for a single file.
export default function FilePicker({ file, onChange, disabled }) {
  const [dragging, setDragging] = useState(false)

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (!disabled && event.dataTransfer.files[0]) onChange(event.dataTransfer.files[0])
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-400'
      } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <input
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        disabled={disabled}
        onChange={(event) => event.target.files[0] && onChange(event.target.files[0])}
        className="sr-only"
      />
      {file ? (
        <>
          <span dir="auto" className="max-w-full truncate font-medium text-slate-900">{file.name}</span>
          <span className="text-xs text-slate-500">
            {formatSize(file.size)} · click to choose another file
          </span>
        </>
      ) : (
        <>
          <span className="font-medium text-slate-900">Choose a file or drop it here</span>
          <span className="text-xs text-slate-500">PDF, Word, text, Markdown or an image · up to 10 MB</span>
        </>
      )}
    </label>
  )
}
