import { useContext } from 'react'
import ErrorAlert from '../../components/ErrorAlert'
import { LanguageContext, useT } from '../../i18n/context'

export default function LabelTranslationNotice({ lesson, onRetry, onOpenSettings }) {
  const t = useT()
  const language = useContext(LanguageContext)
  if (lesson.plan.language === language) return null
  const translation = lesson.labelTranslations?.[language]
  if (translation?.status === 'ready') return null
  if (translation?.status === 'error') {
    return (
      <div className="shrink-0 space-y-1">
        <p className="text-xs text-slate-500">{t('titlesTranslationFailed')}</p>
        <ErrorAlert error={translation.error} onOpenSettings={onOpenSettings}>
          <button onClick={onRetry} className="font-medium underline">{t('tryAgain')}</button>
        </ErrorAlert>
      </div>
    )
  }
  return <p role="status" className="shrink-0 text-xs text-slate-500">{t('translatingTitles')}</p>
}
