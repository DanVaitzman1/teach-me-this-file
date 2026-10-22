import Dialog from '../../components/Dialog'
import { useT } from '../../i18n/context'
import LessonList from './LessonList'

// Every lesson in this tab: switch to one, delete one, or start a new one.
export default function LessonsDialog({ lessons, activeId, onOpen, onNew, onDelete, onClose }) {
  const t = useT()

  return (
    <Dialog title={t('yourLessons')} onClose={onClose}>
      <div className="space-y-4">
        <button
          onClick={() => {
            onNew()
            onClose()
          }}
          className="w-full rounded-xl border-2 border-dashed border-indigo-300 py-3 text-sm font-semibold text-action transition-colors hover:border-indigo-500 hover:bg-indigo-50"
        >
          + {t('newLesson')}
        </button>

        <LessonList
          lessons={lessons}
          activeId={activeId}
          onOpen={(id) => {
            onOpen(id)
            onClose()
          }}
          onDelete={onDelete}
        />
        <p className="text-center text-xs text-slate-400">{t('lessonsStorageNote')}</p>
      </div>
    </Dialog>
  )
}
