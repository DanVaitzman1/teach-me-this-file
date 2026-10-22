import { useT } from '../../i18n/context'

// "Step 3 of 7", and a bar of how much of the lesson is done (completed steps).
export default function LessonProgress({ current, done, total, compact = false }) {
  const t = useT()
  const finished = done === total
  const percent = Math.round((done / total) * 100)
  const label = finished ? t('allStepsDone') : t('stepOf', { current, total })

  return (
    <div className={`min-w-0 flex-1 ${compact ? 'flex items-center gap-3' : 'space-y-2'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className={`font-semibold text-slate-900 ${compact ? 'text-sm' : ''}`}>{label}</p>
        {!compact && <p className="text-xs font-medium text-slate-500">{percent}%</p>}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={label}
        className={`h-2 overflow-hidden rounded-full bg-slate-200 ${compact ? 'min-w-8 flex-1' : ''}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ${finished ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-500 rtl:bg-gradient-to-l'}`}
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
    </div>
  )
}
