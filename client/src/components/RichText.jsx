import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

// remark-breaks keeps single line breaks. Plain Markdown joins them into one
// paragraph, which merges exercise lists from the file ("א. … ב. …") into a block.
const REMARK_PLUGINS = [remarkGfm, remarkMath, remarkBreaks]
const REHYPE_PLUGINS = [rehypeKatex]

// For one-line text such as titles: no paragraph wrapper.
const INLINE_COMPONENTS = { p: ({ children }) => children }

// Markdown (with tables) and LaTeX math ($...$, $$...$$), rendered by KaTeX.
// Plain-text math like "2^4" gets reordered by the browser inside Hebrew or
// Arabic text (it shows as "4^2"); KaTeX formulas are isolated as left-to-right
// (see index.css), so they read correctly in any language.
export default function RichText({ children, inline = false }) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={inline ? INLINE_COMPONENTS : undefined}
    >
      {children}
    </ReactMarkdown>
  )
}
