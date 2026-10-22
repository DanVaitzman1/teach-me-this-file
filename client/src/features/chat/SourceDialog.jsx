import Dialog from '../../components/Dialog'
import RichText from '../../components/RichText'

// Shows the passages of the uploaded file that a tutor message was based on.
// For a PDF, `page` is the page's position in the file, which can differ from
// the number printed on the page, hence "PDF page".
export default function SourceDialog({ passages, isPdf, onClose }) {
  return (
    <Dialog title="Source from your file" onClose={onClose}>
      <ol className="space-y-4">
        {passages.map((passage) => (
          <li key={passage.id} className="space-y-1">
            {isPdf && passage.page && <p className="text-xs font-medium text-slate-500">PDF page {passage.page}</p>}
            <div className="rich-text rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <RichText>{passage.text}</RichText>
            </div>
          </li>
        ))}
      </ol>
    </Dialog>
  )
}
