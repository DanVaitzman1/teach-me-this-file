import { useState } from 'react'
import { KeyIcon } from './components/Icons'
import ServerStatus from './components/ServerStatus'
import LessonScreen from './features/lesson/LessonScreen'
import LessonNavigation from './features/lessons/LessonNavigation'
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
  const { lessons, activeLesson, storageFull, start, retryPlan, retryLabels, open, newLesson, sendMessage, setDraft, stop, retryTurn, remove } =
    useLessons(apiKey, preferences.language)

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
          <div className="lg:hidden">
            <RecentLessons lessons={lessons} onOpen={open} onDelete={remove} onShowAll={() => setLessonsOpen(true)} />
          </div>
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
        onDraftChange={(text) => setDraft(id, text)}
        onRetryLabels={() => retryLabels(id)}
        onOpenSettings={openSettings}
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
    <div className="school-background min-h-dvh text-slate-900 lg:pl-72">
      <LessonNavigation
        lessons={lessons}
        activeId={activeLesson?.id}
        hasKey={hasKey}
        onOpen={open}
        onNew={newLesson}
        onDelete={remove}
        onSettings={openSettings}
        menuOpen={lessonsOpen}
        onShowMenu={() => setLessonsOpen(true)}
        onCloseMenu={() => setLessonsOpen(false)}
      />

      <main className={`mx-auto p-4 lg:p-6 ${inLesson ? 'flex h-[calc(100dvh-3.5rem)] max-w-7xl flex-col gap-3 lg:h-dvh lg:gap-4' : 'max-w-2xl space-y-4'}`}>
        <ServerStatus status={server.status} onRetry={server.retry} />

        {storageFull && (
          <p role="alert" className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            {t('storageFull')}
          </p>
        )}

        {needsApiKey && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
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
