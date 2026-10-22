import { useRef, useState } from 'react'
import { uploadDocument } from '../../api/documents'
import ElapsedTime from '../../components/ElapsedTime'
import ErrorAlert from '../../components/ErrorAlert'
import FilePicker from './FilePicker'
import { SAMPLE_DOCUMENT, SAMPLE_TEACHER_PROMPT } from './sampleDocument'

const MAX_FILE_MB = 10

export default function UploadScreen({ apiKey, onUploaded, onOpenSettings }) {
  const [file, setFile] = useState(null)
  const [teacherPrompt, setTeacherPrompt] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  function chooseFile(nextFile) {
    setError(
      nextFile.size > MAX_FILE_MB * 1024 * 1024
        ? { code: 'FILE_TOO_LARGE', message: `Files up to ${MAX_FILE_MB} MB are supported.` }
        : null,
    )
    setFile(nextFile)
  }

  async function handleSubmit(event) {
    event.preventDefault()
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

  const canSubmit = file && teacherPrompt.trim() && !uploading && error?.code !== 'FILE_TOO_LARGE'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Create a lesson</h2>
        <p className="text-sm text-slate-600">
          Upload the material and tell the tutor how to teach it. It will guide the student step by step.
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-slate-700">Lesson material</span>
        <FilePicker file={file} onChange={chooseFile} disabled={uploading} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="teacher-prompt" className="block text-sm font-medium text-slate-700">
          Instructions for the tutor
        </label>
        <textarea
          id="teacher-prompt"
          maxLength={2000}
          dir="auto"
          rows={4}
          value={teacherPrompt}
          onChange={(event) => setTeacherPrompt(event.target.value)}
          disabled={uploading}
          placeholder="e.g. Teach this to 7th graders, in French. Be Socratic. Under 15 minutes."
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50"
        />
      </div>

      {error && <ErrorAlert error={error} onOpenSettings={onOpenSettings} />}

      <div className="flex items-center justify-end gap-3">
        {uploading && (
          <>
            <span role="status" className="mr-auto flex items-center gap-2 text-sm text-slate-600">
              <span className="size-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              <span>
                Reading the file… <ElapsedTime />
                <span className="block text-xs text-slate-500">PDFs and images can take up to a minute.</span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => abortRef.current.abort()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </>
        )}
        {import.meta.env.DEV && !uploading && (
          <button
            type="button"
            onClick={() =>
              onUploaded({ document: SAMPLE_DOCUMENT, teacherPrompt: teacherPrompt.trim() || SAMPLE_TEACHER_PROMPT })
            }
            className="mr-auto rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
          >
            Use sample document (dev)
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Start lesson
        </button>
      </div>
    </form>
  )
}
