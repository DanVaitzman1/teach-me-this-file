// "Step 3 of 7", and a bar of how much of the lesson is done (completed steps).
export default function LessonProgress({ current, done, total }) {
  const finished = done === total
  const percent = Math.round((done / total) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold text-slate-900">{finished ? 'All steps done' : `Step ${current} of ${total}`}</p>
        <p className="text-xs font-medium text-slate-500">{percent}%</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={finished ? 'All steps done' : `Step ${current} of ${total}`}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ${finished ? 'bg-emerald-500' : 'bg-indigo-600'}`}
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
    </div>
  )
}
