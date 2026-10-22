import RichText from '../../components/RichText'

// The plan as a list: done steps are checked, the current one is highlighted.
export default function StepList({ steps, currentIndex }) {
  return (
    <ol className="space-y-1">
      {steps.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'
        return (
          <li
            key={step.id}
            aria-current={state === 'current' ? 'step' : undefined}
            className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
              state === 'current' ? 'bg-indigo-50 font-medium text-indigo-900' : 'text-slate-600'
            }`}
          >
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs ${
                state === 'done'
                  ? 'bg-indigo-600 text-white'
                  : state === 'current'
                    ? 'border-2 border-indigo-600 text-indigo-700'
                    : 'border border-slate-300 text-slate-400'
              }`}
            >
              {state === 'done' ? '✓' : index + 1}
            </span>
            <span>
              <RichText inline>{step.title}</RichText>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
