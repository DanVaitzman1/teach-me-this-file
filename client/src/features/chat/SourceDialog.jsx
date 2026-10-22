import Dialog from '../../components/Dialog'
import RichText from '../../components/RichText'
import { useT } from '../../i18n/context'

// Shows the passages of the uploaded file that a tutor message was based on.
// For a PDF, `page` is the page's position in the file, which can differ from
// the number printed on the page, hence "PDF page".
export default function SourceDialog({ passages, isPdf, onClose }) {
  const t = useT()
  return (
    <Dialog title={t('sourceTitle')} onClose={onClose}>
      <ol className="space-y-4">
        {passages.map((passage) => (
          <li key={passage.id} className="space-y-1">
            {isPdf && passage.page && <p className="text-xs font-medium text-slate-500">{t('pdfPage', { n: passage.page })}</p>}
            <div dir="auto" className="rich-text rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <RichText>{passage.text}</RichText>
            </div>
          </li>
        ))}
      </ol>
    </Dialog>
  )
}
