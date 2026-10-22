import LessonCard from './LessonCard'
import { useT } from '../../i18n/context'

// Shared by the desktop sidebar and the phone's lesson menu.
export default function LessonList({ lessons, activeId, onOpen, onDelete }) {
  const t = useT()
  if (lessons.length === 0) return <p className="py-4 text-sm text-slate-500">{t('noLessons')}</p>

  return (
    <ul className="space-y-2">
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <LessonCard
            lesson={lesson}
            active={lesson.id === activeId}
            onOpen={() => onOpen(lesson.id)}
            onDelete={() => window.confirm(t('confirmDeleteLesson')) && onDelete(lesson.id)}
          />
        </li>
      ))}
    </ul>
  )
}
