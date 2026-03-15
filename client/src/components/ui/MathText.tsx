import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathTextProps {
  /** Text with LaTeX delimiters: $...$ for inline, $$...$$ for block */
  children: string
  className?: string
}

interface Segment {
  type: 'text' | 'inline-math' | 'block-math'
  value: string
}

const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g
const RAW_LATEX_HINT = /\\[a-zA-Z]+|\^\{|_\{|\\left|\\right|\\frac|\\sqrt|\\mathbb/

function parseSegments(input: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0

  for (const match of input.matchAll(MATH_PATTERN)) {
    const matchStart = match.index ?? 0
    if (matchStart > lastIndex) {
      segments.push({ type: 'text', value: input.slice(lastIndex, matchStart) })
    }

    const raw = match[0]
    if (raw.startsWith('$$') && raw.endsWith('$$')) {
      segments.push({ type: 'block-math', value: raw.slice(2, -2).trim() })
    } else {
      segments.push({ type: 'inline-math', value: raw.slice(1, -1).trim() })
    }
    lastIndex = matchStart + raw.length
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', value: input.slice(lastIndex) })
  }

  return segments
}

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
    })
  } catch {
    return latex
  }
}

/**
 * Renders text with embedded LaTeX math.
 * Use `$...$` for inline math, `$$...$$` for block (display) math.
 */
export function MathText({ children, className }: MathTextProps) {
  const segments = useMemo(() => parseSegments(children), [children])

  const hasOnlyText = segments.every((s) => s.type === 'text')
  if (hasOnlyText) {
    if (RAW_LATEX_HINT.test(children)) {
      const html = renderLatex(children, false)
      return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
    }
    return <span className={className}>{children}</span>
  }

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.value}</span>
        }

        const displayMode = segment.type === 'block-math'
        const html = renderLatex(segment.value, displayMode)

        return displayMode ? (
          <span
            key={index}
            className="math-block"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <span
            key={index}
            className="math-inline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      })}
    </span>
  )
}
