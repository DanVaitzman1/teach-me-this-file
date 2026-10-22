// "Step 3 of 7" with a bar. Counts the current step as reached, so step 1 already shows progress.
export default function LessonProgress({ current, total }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-700">
        Step {current} of {total}
      </p>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={`Step ${current} of ${total}`}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(current / total) * 100}%` }} />
      </div>
    </div>
  )
}
