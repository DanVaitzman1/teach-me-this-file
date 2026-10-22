import { useState } from 'react'
import ServerStatus from './components/ServerStatus'
import LessonScreen from './features/lesson/LessonScreen'
import PlanningScreen from './features/lesson/PlanningScreen'
import SettingsDialog from './features/settings/SettingsDialog'
import { useApiKey } from './features/settings/useApiKey'
import UploadScreen from './features/upload/UploadScreen'
import { useLesson } from './lesson/useLesson'
import { useServerStatus } from './useServerStatus'

function App() {
  const server = useServerStatus()
  const [apiKey, setApiKey] = useApiKey()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { lesson, start, retryPlan, sendMessage, stop, retryTurn, reset } = useLesson(apiKey)

  const openSettings = () => setSettingsOpen(true)
  const needsApiKey = server.status === 'ready' && !server.hasServerKey && !apiKey

  function renderScreen() {
    switch (lesson.status) {
      case 'idle':
        return (
          <UploadScreen
            apiKey={apiKey}
            onUploaded={({ document, teacherPrompt }) => start(document, teacherPrompt)}
            onOpenSettings={openSettings}
          />
        )
      case 'planning':
      case 'plan_error':
        return <PlanningScreen lesson={lesson} onRetry={retryPlan} onCancel={reset} onOpenSettings={openSettings} />
      case 'ready':
      case 'finished':
        return (
          <LessonScreen lesson={lesson} onSend={sendMessage} onStop={stop} onRetry={retryTurn} onNewLesson={reset} />
        )
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-indigo-600">Teach Me This File</h1>
        <button
          onClick={openSettings}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Settings
        </button>
      </header>

      <main className={`mx-auto space-y-4 p-4 ${lesson.status === 'ready' || lesson.status === 'finished' ? 'max-w-5xl' : 'max-w-2xl'}`}>
        <ServerStatus status={server.status} onRetry={server.retry} />

        {needsApiKey && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <span>Add a Gemini API key to start a lesson.</span>
            <button
              onClick={openSettings}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
            >
              Add key
            </button>
          </div>
        )}

        {server.status === 'ready' && renderScreen()}
      </main>

      {settingsOpen && (
        <SettingsDialog
          apiKey={apiKey}
          hasServerKey={server.hasServerKey}
          onSave={setApiKey}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

export default App
