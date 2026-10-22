import Dialog from '../../components/Dialog'
import { useT } from '../../i18n/context'
import LessonCard from './LessonCard'

// Every lesson in this tab: switch to one, delete one, or start a new one.
export default function LessonsDialog({ lessons, activeId, onOpen, onNew, onDelete, onClose }) {
  const t = useT()

  function confirmDelete(id) {
    if (window.confirm(t('confirmDeleteLesson'))) onDelete(id)
  }

  return (
    <Dialog title={t('yourLessons')} onClose={onClose}>
      <div className="space-y-4">
        <button
          onClick={() => {
            onNew()
            onClose()
          }}
          className="w-full rounded-xl border-2 border-dashed border-indigo-300 py-3 text-sm font-semibold text-indigo-600 transition-colors hover:border-indigo-500 hover:bg-indigo-50"
        >
          + {t('newLesson')}
        </button>

        {lessons.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">{t('noLessons')}</p>
        ) : (
          <ul className="space-y-2">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <LessonCard
                  lesson={lesson}
                  active={lesson.id === activeId}
                  onOpen={() => {
                    onOpen(lesson.id)
                    onClose()
                  }}
                  onDelete={() => confirmDelete(lesson.id)}
                />
              </li>
            ))}
          </ul>
        )}
        <p className="text-center text-xs text-slate-400">{t('lessonsStorageNote')}</p>
      </div>
    </Dialog>
  )
}
