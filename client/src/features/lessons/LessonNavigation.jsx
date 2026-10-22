import { BookIcon, GearIcon, StackIcon } from '../../components/Icons'
import { useT } from '../../i18n/context'
import LessonList from './LessonList'
import LessonsDialog from './LessonsDialog'

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-school-sun text-school-ink shadow-sm">
        <BookIcon className="size-5" />
      </span>
      <h1 className="font-bold tracking-tight text-slate-900">Teach Me This File</h1>
    </div>
  )
}

function SettingsButton({ hasKey, onClick }) {
  const t = useT()
  return (
    <button
      onClick={onClick}
      aria-label={t('settings')}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
    >
      <GearIcon className="size-4" />
      <span className="hidden lg:inline">{t('settings')}</span>
      <span
        className={`size-2 rounded-full ${hasKey ? 'bg-emerald-500' : 'bg-amber-500'}`}
        title={hasKey ? t('keySet') : t('noKeyYet')}
      />
    </button>
  )
}

// A fixed left sidebar on desktop; a compact header and lesson menu on phones.
export default function LessonNavigation({ lessons, activeId, hasKey, onOpen, onNew, onDelete, onSettings, menuOpen, onShowMenu, onCloseMenu }) {
  const t = useT()
  const unread = lessons.filter((lesson) => lesson.hasUnreadReply).length

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200 bg-surface/95 lg:flex">
        <div className="space-y-6 p-5 pb-4">
          <Brand />
          <button onClick={onNew} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
            + {t('newLesson')}
          </button>
          <h2 className="flex items-center justify-between text-sm font-semibold text-slate-600">
            {t('yourLessons')}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{lessons.length}</span>
          </h2>
        </div>
        <nav aria-label={t('yourLessons')} className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <LessonList lessons={lessons} activeId={activeId} onOpen={onOpen} onDelete={onDelete} />
        </nav>
        <div className="space-y-3 border-t border-slate-200 p-4">
          <SettingsButton hasKey={hasKey} onClick={onSettings} />
          <p className="text-xs leading-relaxed text-slate-500">{t('lessonsStorageNote')}</p>
        </div>
      </aside>

      <header className="sticky top-0 z-40 h-14 border-b border-slate-200/80 bg-surface/90 backdrop-blur lg:hidden">
        <div className="flex h-full items-center justify-between px-4">
          <Brand />
          <div className="flex items-center gap-1">
            <button
              onClick={onShowMenu}
              aria-label={t('lessons')}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              className="relative flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              <StackIcon className="size-4" />
              <span className="grid min-w-5 place-items-center rounded-full bg-indigo-600 px-1 text-xs font-semibold text-white">{lessons.length}</span>
              {unread > 0 && (
                <span role="status" aria-label={t('unreadLessons', { n: unread })} className="absolute top-1 end-1 size-2 rounded-full bg-emerald-500 ring-2 ring-surface" />
              )}
            </button>
            <SettingsButton hasKey={hasKey} onClick={onSettings} />
          </div>
        </div>
      </header>

      {menuOpen && (
        <LessonsDialog
          lessons={lessons}
          activeId={activeId}
          onOpen={onOpen}
          onNew={onNew}
          onDelete={onDelete}
          onClose={onCloseMenu}
        />
      )}
    </>
  )
}
