import { useState } from 'react'
import { BookIcon, GearIcon, KeyIcon, StackIcon } from './components/Icons'
import ServerStatus from './components/ServerStatus'
import LessonScreen from './features/lesson/LessonScreen'
import LessonsDialog from './features/lessons/LessonsDialog'
import RecentLessons from './features/lessons/RecentLessons'
import PlanningScreen from './features/lesson/PlanningScreen'
import SettingsDialog from './features/settings/SettingsDialog'
import { useApiKey } from './features/settings/useApiKey'
import { usePreferences } from './features/settings/usePreferences'
import UploadScreen from './features/upload/UploadScreen'
import { LanguageContext, useT } from './i18n/context'
import { useLessons } from './lesson/useLessons'
import { useServerStatus } from './useServerStatus'

// Holds the display preferences and provides the interface language below.
function App() {
  const [preferences, setPreference] = usePreferences()
  return (
    <LanguageContext value={preferences.language}>
      <AppContent preferences={preferences} onPreferenceChange={setPreference} />
    </LanguageContext>
  )
}

function AppContent({ preferences, onPreferenceChange }) {
  const t = useT()
  const server = useServerStatus()
  const [apiKey, setApiKey] = useApiKey()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [lessonsOpen, setLessonsOpen] = useState(false)
  const { lessons, activeLesson, start, retryPlan, open, newLesson, sendMessage, stop, retryTurn, remove } =
    useLessons(apiKey)

  const openSettings = () => setSettingsOpen(true)
  const needsApiKey = server.status === 'ready' && !server.hasServerKey && !apiKey

  // No active lesson: the upload screen, with recent lessons to go back to.
  function renderScreen() {
    if (!activeLesson) {
      return (
        <div className="space-y-8">
          <UploadScreen
            apiKey={apiKey}
            onUploaded={({ document, teacherPrompt }) => start(document, teacherPrompt)}
            onOpenSettings={openSettings}
          />
          <RecentLessons lessons={lessons} onOpen={open} onDelete={remove} onShowAll={() => setLessonsOpen(true)} />
        </div>
      )
    }
    const { id } = activeLesson
    if (activeLesson.status === 'planning' || activeLesson.status === 'plan_error') {
      return (
        <PlanningScreen
          lesson={activeLesson}
          onRetry={() => retryPlan(id)}
          onCancel={() => remove(id)}
          onOpenSettings={openSettings}
        />
      )
    }
    return (
      <LessonScreen
        key={id}
        lesson={activeLesson}
        onSend={(text) => sendMessage(id, text)}
        onStop={() => stop(id)}
        onRetry={(messageId) => retryTurn(id, messageId)}
        onNewLesson={newLesson}
      />
    )
  }

  const inLesson = activeLesson?.status === 'ready' || activeLesson?.status === 'finished'
  const hasKey = Boolean(apiKey) || server.hasServerKey

  return (
    <div className="min-h-dvh bg-gradient-to-b from-indigo-50/70 via-slate-50 to-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <BookIcon className="size-5" />
            </span>
            <h1 className="font-bold tracking-tight text-slate-900">Teach Me This File</h1>
          </div>
          <div className="flex items-center gap-1">
            {lessons.length > 0 && (
              <button
                onClick={() => setLessonsOpen(true)}
                aria-label={t('lessons')}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <StackIcon className="size-4" />
                <span className="hidden sm:inline">{t('lessons')}</span>
                <span className="grid min-w-5 place-items-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                  {lessons.length}
                </span>
              </button>
            )}
            <button
              onClick={openSettings}
              aria-label={t('settings')}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              {server.status === 'ready' && (
                <span
                  className={`size-2 rounded-full ${hasKey ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  title={hasKey ? t('keySet') : t('noKeyYet')}
                />
              )}
              <GearIcon className="size-4" />
              <span className="hidden sm:inline">{t('settings')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className={`mx-auto space-y-4 p-4 ${inLesson ? 'max-w-5xl' : 'max-w-2xl'}`}>
        <ServerStatus status={server.status} onRetry={server.retry} />

        {needsApiKey && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
              <KeyIcon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="font-semibold">{t('keyBannerTitle')}</b> {t('keyBannerText')}
            </span>
            <button
              onClick={openSettings}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-500"
            >
              {t('addKey')}
            </button>
          </div>
        )}

        {server.status === 'ready' && renderScreen()}
      </main>

      {lessonsOpen && (
        <LessonsDialog
          lessons={lessons}
          activeId={activeLesson?.id}
          onOpen={open}
          onNew={newLesson}
          onDelete={remove}
          onClose={() => setLessonsOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          apiKey={apiKey}
          hasServerKey={server.hasServerKey}
          onSave={setApiKey}
          preferences={preferences}
          onPreferenceChange={onPreferenceChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

export default App
