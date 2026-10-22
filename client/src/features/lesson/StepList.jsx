import { CheckIcon } from '../../components/Icons'
import RichText from '../../components/RichText'

// The plan as a timeline: done steps are checked, the current one is highlighted.
export default function StepList({ steps, currentIndex }) {
  return (
    <ol>
      {steps.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'
        const isLast = index === steps.length - 1
        return (
          <li key={step.id} aria-current={state === 'current' ? 'step' : undefined} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute start-[11px] top-7 -bottom-1 w-0.5 rounded-full ${
                  state === 'done' ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              />
            )}
            <span
              className={`relative grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors ${
                state === 'done'
                  ? 'bg-indigo-600 text-white'
                  : state === 'current'
                    ? 'bg-white text-indigo-700 ring-2 ring-indigo-600'
                    : 'bg-white text-slate-400 ring-1 ring-slate-300'
              }`}
            >
              {state === 'done' ? <CheckIcon className="size-3.5" /> : index + 1}
            </span>
            <span
              className={`pt-0.5 text-sm leading-snug ${
                state === 'current' ? 'font-semibold text-slate-900' : state === 'done' ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              <RichText inline>{step.title}</RichText>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
