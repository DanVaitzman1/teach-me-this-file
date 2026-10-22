import { useRef, useState } from 'react'
import { CloseIcon, UploadIcon } from '../../components/Icons'
import { useT } from '../../i18n/context'

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp'
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

// The badge shown for each kind of file.
const BADGES = {
  pdf: { label: 'PDF', className: 'bg-rose-100 text-rose-700' },
  docx: { label: 'DOCX', className: 'bg-sky-100 text-sky-700' },
  txt: { label: 'TXT', className: 'bg-slate-200 text-slate-700' },
  md: { label: 'MD', className: 'bg-slate-200 text-slate-700' },
  image: { label: 'IMG', className: 'bg-violet-100 text-violet-700' },
}

function badgeFor(fileName) {
  const extension = fileName.split('.').pop().toLowerCase()
  if (IMAGE_EXTENSIONS.includes(extension)) return BADGES.image
  return BADGES[extension] ?? { label: extension.slice(0, 4).toUpperCase(), className: 'bg-slate-200 text-slate-700' }
}

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Drop zone when empty; a card with the chosen file, "Change" and remove otherwise.
// A file can also be dropped on the card to replace it.
export default function FilePicker({ file, onChange, onClear, disabled }) {
  const t = useT()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (!disabled && event.dataTransfer.files[0]) onChange(event.dataTransfer.files[0])
  }

  function handleInput(event) {
    if (event.target.files[0]) onChange(event.target.files[0])
    // Cleared so that choosing the same file again still counts as a change.
    event.target.value = ''
  }

  const badge = file && badgeFor(file.name)

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        disabled={disabled}
        onChange={handleInput}
        className="sr-only"
        tabIndex={-1}
      />

      {file ? (
        <div
          className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
            dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <span className={`grid size-12 shrink-0 place-items-center rounded-lg text-xs font-bold ${badge.className}`}>
            {badge.label}
          </span>
          <div className="min-w-0 flex-1">
            <p dir="auto" className="truncate font-medium text-slate-900">
              {file.name}
            </p>
            <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current.click()}
            disabled={disabled}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
          >
            {t('change')}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label={t('removeFile')}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          disabled={disabled}
          className={`group flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all ${
            dragging
              ? 'scale-[1.01] border-indigo-500 bg-indigo-50'
              : 'border-slate-300 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/40'
          }`}
        >
          <span
            className={`grid size-12 place-items-center rounded-full transition-colors ${
              dragging ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
            }`}
          >
            <UploadIcon />
          </span>
          <span className="space-y-1">
            <span className="block font-medium text-slate-900">
              {dragging ? t('dropItHere') : (
                <>
                  {t('dropFileOr')} <span className="text-indigo-600 underline-offset-2 group-hover:underline">{t('browse')}</span>
                </>
              )}
            </span>
            <span className="block text-xs text-slate-500">{t('pasteHint')}</span>
          </span>
          <span className="flex flex-wrap justify-center gap-1.5">
            {['PDF', 'Word', t('typeText'), 'Markdown', t('typeImage')].map((type) => (
              <span key={type} className="rounded-full bg-surface px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200">
                {type}
              </span>
            ))}
            <span className="px-1 py-0.5 text-xs text-slate-400">{t('upTo10MB')}</span>
          </span>
        </button>
      )}
    </div>
  )
}
