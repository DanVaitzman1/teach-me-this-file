import { useT } from '../../i18n/context'
import LessonCard from './LessonCard'

const SHOWN = 3

// Under the upload form: jump back into a recent lesson in one click.
export default function RecentLessons({ lessons, onOpen, onDelete, onShowAll }) {
  const t = useT()
  if (lessons.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">{t('continueLesson')}</h2>
        {lessons.length > SHOWN && (
          <button onClick={onShowAll} className="text-sm font-medium text-indigo-600 hover:underline">
            {t('showAllLessons', { n: lessons.length })}
          </button>
        )}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {lessons.slice(0, SHOWN).map((lesson) => (
          <li key={lesson.id}>
            <LessonCard
              lesson={lesson}
              onOpen={() => onOpen(lesson.id)}
              onDelete={() => window.confirm(t('confirmDeleteLesson')) && onDelete(lesson.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
