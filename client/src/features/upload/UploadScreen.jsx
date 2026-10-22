import { useEffect, useRef, useState } from 'react'
import { uploadDocument } from '../../api/documents'
import ElapsedTime from '../../components/ElapsedTime'
import ErrorAlert from '../../components/ErrorAlert'
import { ArrowRightIcon, CheckIcon, SparklesIcon } from '../../components/Icons'
import FilePicker from './FilePicker'
import { SAMPLE_DOCUMENT, SAMPLE_TEACHER_PROMPT } from './sampleDocument'
import { useT } from '../../i18n/context'
import { MAX_FILE_MB } from '../../../../shared/documentLimits.mjs'

const MAX_PROMPT_CHARS = 2000

// One click fills the instructions; the teacher can edit them after.
const EXAMPLE_PROMPTS = [
  { label: '7th grade · French · Socratic', text: 'Teach this to 7th graders, in French. Be Socratic. Keep it under 15 minutes.', color: 'bg-school-sky' },
  { label: 'Explain like I’m 10', text: 'Explain it simply, with everyday examples, as if to a curious 10-year-old.', color: 'bg-school-mint' },
  { label: 'Quiz me', text: 'Mostly ask questions, one at a time, and explain only when the student gets it wrong.', color: 'bg-school-peach' },
  { label: 'בעברית, לתיכון', text: 'למד את החומר בעברית, לתלמידי תיכון. קצב מהיר, עם תרגיל קצר אחרי כל רעיון.', color: 'bg-school-sun' },
]

// The number of a form section; a check once that part is filled in.
function SectionTitle({ number, done, children }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid size-6 place-items-center rounded-full text-xs font-bold transition-colors ${
          done ? 'bg-emerald-500 text-white' : number === 1 ? 'bg-school-sun text-school-ink' : 'bg-school-peach text-school-ink'
        }`}
      >
        {done ? <CheckIcon className="size-3.5" /> : number}
      </span>
      {children}
    </div>
  )
}

export default function UploadScreen({ apiKey, onUploaded, onOpenSettings }) {
  const t = useT()
  const [file, setFile] = useState(null)
  const [teacherPrompt, setTeacherPrompt] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)
  const formRef = useRef(null)
  const promptRef = useRef(null)

  // Leaving the upload screen must not later open a lesson from an abandoned read.
  useEffect(() => () => abortRef.current?.abort(), [])

  function chooseFile(nextFile) {
    setError(
      nextFile.size > MAX_FILE_MB * 1024 * 1024
        ? { code: 'FILE_TOO_LARGE', message: `Files up to ${MAX_FILE_MB} MB are supported.` }
        : null,
    )
    setFile(nextFile)
  }

  function clearFile() {
    setFile(null)
    setError(null)
  }

  // A screenshot or copied file pasted anywhere on the page becomes the lesson material.
  useEffect(() => {
    function handlePaste(event) {
      const pasted = event.clipboardData?.files[0]
      if (pasted && !uploading) chooseFile(pasted)
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [uploading])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    const controller = new AbortController()
    abortRef.current = controller
    setUploading(true)
    setError(null)
    try {
      const document = await uploadDocument(file, { apiKey, signal: controller.signal })
      onUploaded({ document, teacherPrompt: teacherPrompt.trim() })
    } catch (err) {
      if (err.name !== 'AbortError') setError(err)
    } finally {
      setUploading(false)
    }
  }

  function applyExample(text) {
    setTeacherPrompt(text)
    promptRef.current.focus()
  }

  const canSubmit = file && teacherPrompt.trim() && !uploading && error?.code !== 'FILE_TOO_LARGE'

  return (
    <div className="space-y-6 py-2 sm:py-6">
      <div className="space-y-2 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-school-mint px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
          <SparklesIcon className="size-3.5" /> {t('heroBadge')}
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('heroTitle')}</h2>
        <p className="mx-auto max-w-md text-slate-600">
          {t('heroText')}
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 border-t-4 border-t-indigo-400 bg-surface p-5 shadow-sm sm:p-7"
      >
        <section className="space-y-3">
          <SectionTitle number={1} done={Boolean(file) && !error}>
            <h3 className="font-semibold text-slate-900">{t('materialTitle')}</h3>
          </SectionTitle>
          <FilePicker file={file} onChange={chooseFile} onClear={clearFile} disabled={uploading} />
          <p className="text-xs text-slate-500">{t('fileLimits')}</p>
        </section>

        <section className="space-y-3">
          <SectionTitle number={2} done={Boolean(teacherPrompt.trim())}>
            <label htmlFor="teacher-prompt" className="font-semibold text-slate-900">
              {t('promptTitle')}
            </label>
          </SectionTitle>
          <div className="relative">
            <textarea
              id="teacher-prompt"
              ref={promptRef}
              maxLength={MAX_PROMPT_CHARS}
              dir="auto"
              rows={4}
              value={teacherPrompt}
              onChange={(event) => setTeacherPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) formRef.current.requestSubmit()
              }}
              disabled={uploading}
              placeholder={t('promptPlaceholder')}
              className="w-full resize-y rounded-xl border border-slate-300 px-3.5 pt-3 pb-7 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50"
            />
            <span className="pointer-events-none absolute right-3 bottom-3 text-xs text-slate-400">
              {teacherPrompt.length}/{MAX_PROMPT_CHARS}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="py-1 text-xs text-slate-500">{t('tryExamples')}</span>
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example.label}
                type="button"
                dir="auto"
                onClick={() => applyExample(example.text)}
                disabled={uploading}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors ${
                  teacherPrompt === example.text
                    ? 'bg-indigo-600 text-white ring-indigo-600'
                    : `${example.color} text-slate-700 ring-slate-200 hover:text-indigo-700 hover:ring-indigo-300`
                }`}
              >
                {example.label}
              </button>
            ))}
          </div>
        </section>

        {error && <ErrorAlert error={error} onOpenSettings={onOpenSettings} />}

        {uploading ? (
          <div role="status" className="space-y-3 rounded-xl bg-indigo-50 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-indigo-900">
                {t('readingFile')} <ElapsedTime />
              </span>
              <button
                type="button"
                onClick={() => abortRef.current.abort()}
                className="rounded-lg px-3 py-1 font-medium text-indigo-700 hover:bg-indigo-100"
              >
                {t('cancel')}
              </button>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-indigo-100">
              <div className="progress-indeterminate h-full w-1/3 rounded-full bg-indigo-500" />
            </div>
            <p className="text-xs text-indigo-800/70">{t('readingFileHelp')}</p>
          </div>
        ) : (
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            {import.meta.env.DEV ? (
              <button
                type="button"
                onClick={() =>
                  onUploaded({ document: SAMPLE_DOCUMENT, teacherPrompt: teacherPrompt.trim() || SAMPLE_TEACHER_PROMPT })
                }
                className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
              >
                {t('sampleDocument')}
              </button>
            ) : (
              <span className="hidden text-xs text-slate-400 sm:block">{t('submitTip')}</span>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {t('startLesson')}
              <ArrowRightIcon className="size-4 transition-transform rtl:rotate-180 group-enabled:group-hover:translate-x-0.5 rtl:group-enabled:group-hover:-translate-x-0.5" />
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
