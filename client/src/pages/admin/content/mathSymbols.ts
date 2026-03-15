/**
 * Shared math symbol palette for admin question editors.
 *
 * Each entry is either a button { label, snippet, cursor?, title }
 * or a separator { sep: true }.
 *
 * - `snippet` is inserted at the cursor position in the textarea.
 * - `cursor` (optional) overrides where the caret is placed after insertion
 *   (offset from the start of the snippet). Without it, caret goes to the end.
 */

type MathSymbolButton = { label: string; snippet: string; cursor?: number; title: string }
type MathSymbolSep = { sep: true }
export type MathSymbolEntry = MathSymbolButton | MathSymbolSep

interface AuthoringInsert {
  text: string
  cursor?: number
}

const AUTHORING_TEMPLATE_BY_LABEL: Record<string, string> = {
  '$…$': '$|$',
  '$$…$$': '$$|$$',
  '√': '√(|)',
  '∛': '∛(|)',
  'ⁿ√': 'ⁿ√(|)',
  '⁶√': '⁶√(|)',
  'sin': 'sin(|)',
  'cos': 'cos(|)',
  'tan': 'tan(|)',
  'cot': 'cot(|)',
  'arcsin': 'arcsin(|)',
  'arccos': 'arccos(|)',
  'arctan': 'arctan(|)',
  'sin²': 'sin²(|)',
  'cos²': 'cos²(|)',
  'log': 'log(|)',
  'logₐ': 'logₐ(|)',
  'lg': 'lg(|)',
  'ln': 'ln(|)',
  '∫': '∫(|)',
  '∫dx': '∫(|)dx',
  'Σ': 'Σ(|)',
  '∏': '∏(|)',
  'lim': 'lim(|)',
  'lim∞': 'lim x→∞',
  "f'": "f'(|)",
  '(…)': '(|)',
  '[…]': '[|]',
  '{…}': '{|}',
  '|…|': '|x|',
  'vec': 'vec(|)',
}

const buildInsertFromTemplate = (template: string): AuthoringInsert => {
  const cursor = template.indexOf('|')
  if (cursor < 0) return { text: template }
  return {
    text: template.replace('|', ''),
    cursor,
  }
}

export const getAuthoringInsert = (entry: MathSymbolButton): AuthoringInsert => {
  const template = AUTHORING_TEMPLATE_BY_LABEL[entry.label]
  if (template) return buildInsertFromTemplate(template)

  if (entry.label !== 'a/b' && entry.label !== 'C(n,k)' && !entry.label.includes('…')) {
    return { text: entry.label }
  }

  return { text: entry.snippet, cursor: entry.cursor }
}

export const MATH_SYMBOLS: readonly MathSymbolEntry[] = [
  // ── Wrappers ──
  { label: '$…$', snippet: '$$', cursor: 1, title: 'Inline math wrapper' },
  { label: '$$…$$', snippet: '$$$$', cursor: 2, title: 'Display math wrapper' },
  { sep: true },

  // ── Powers, subscripts, fractions ──
  { label: 'x²', snippet: '^{2}', title: 'Power (superscript)' },
  { label: 'xₙ', snippet: '_{n}', title: 'Subscript' },
  { label: 'a/b', snippet: '\\frac{}{}', cursor: 6, title: 'Fraction  \\frac{a}{b}' },
  { sep: true },

  // ── Roots ──
  { label: '√', snippet: '\\sqrt{}', cursor: 6, title: 'Square root' },
  { label: '∛', snippet: '\\sqrt[3]{}', cursor: 9, title: 'Cube root' },
  { label: 'ⁿ√', snippet: '\\sqrt[n]{}', cursor: 6, title: 'Nth root' },
  { label: '⁶√', snippet: '\\sqrt[6]{}', cursor: 9, title: '6th root' },
  { sep: true },

  // ── Greek letters ──
  { label: 'α', snippet: '\\alpha', title: 'Alpha' },
  { label: 'β', snippet: '\\beta', title: 'Beta' },
  { label: 'γ', snippet: '\\gamma', title: 'Gamma' },
  { label: 'δ', snippet: '\\delta', title: 'Delta' },
  { label: 'θ', snippet: '\\theta', title: 'Theta' },
  { label: 'λ', snippet: '\\lambda', title: 'Lambda' },
  { label: 'μ', snippet: '\\mu', title: 'Mu' },
  { label: 'π', snippet: '\\pi', title: 'Pi' },
  { label: 'σ', snippet: '\\sigma', title: 'Sigma (lowercase)' },
  { label: 'φ', snippet: '\\varphi', title: 'Phi' },
  { label: 'ω', snippet: '\\omega', title: 'Omega' },
  { sep: true },

  // ── Operators & relations ──
  { label: '±', snippet: '\\pm', title: 'Plus-minus' },
  { label: '∓', snippet: '\\mp', title: 'Minus-plus' },
  { label: '×', snippet: '\\times', title: 'Multiply (cross)' },
  { label: '÷', snippet: '\\div', title: 'Divide' },
  { label: '·', snippet: '\\cdot', title: 'Dot product' },
  { label: '∘', snippet: '\\circ', title: 'Composition' },
  { sep: true },

  // ── Relations & inequalities ──
  { label: '≠', snippet: '\\neq', title: 'Not equal' },
  { label: '≈', snippet: '\\approx', title: 'Approximately equal' },
  { label: '≡', snippet: '\\equiv', title: 'Equivalent / congruent' },
  { label: '<', snippet: '<', title: 'Less than' },
  { label: '>', snippet: '>', title: 'Greater than' },
  { label: '≤', snippet: '\\leq', title: 'Less or equal' },
  { label: '≥', snippet: '\\geq', title: 'Greater or equal' },
  { sep: true },

  // ── Trigonometry ──
  { label: 'sin', snippet: '\\sin', title: 'Sine' },
  { label: 'cos', snippet: '\\cos', title: 'Cosine' },
  { label: 'tan', snippet: '\\tan', title: 'Tangent' },
  { label: 'cot', snippet: '\\cot', title: 'Cotangent' },
  { label: 'arcsin', snippet: '\\arcsin', title: 'Arcsine' },
  { label: 'arccos', snippet: '\\arccos', title: 'Arccosine' },
  { label: 'arctan', snippet: '\\arctan', title: 'Arctangent' },
  { label: 'sin²', snippet: '\\sin^{2}', title: 'Sine squared' },
  { label: 'cos²', snippet: '\\cos^{2}', title: 'Cosine squared' },
  { sep: true },

  // ── Logarithms & exponentials ──
  { label: 'log', snippet: '\\log', title: 'Logarithm' },
  { label: 'logₐ', snippet: '\\log_{}', cursor: 5, title: 'Log base a' },
  { label: 'log₂', snippet: '\\log_2', title: 'Log base 2' },
  { label: 'lg', snippet: '\\lg', title: 'Log base 10' },
  { label: 'ln', snippet: '\\ln', title: 'Natural log (ln)' },
  { label: 'eˣ', snippet: 'e^{x}', title: 'Exponential e^x' },
  { sep: true },

  // ── Calculus ──
  { label: '∫', snippet: '\\int_{}^{}', cursor: 6, title: 'Definite integral' },
  { label: '∫dx', snippet: '\\int \\, dx', title: 'Indefinite integral' },
  { label: 'Σ', snippet: '\\sum_{i=1}^{n}', cursor: 6, title: 'Summation' },
  { label: '∏', snippet: '\\prod_{i=1}^{n}', cursor: 7, title: 'Product' },
  { label: 'lim', snippet: '\\lim_{x \\to }', cursor: 12, title: 'Limit' },
  { label: 'lim∞', snippet: '\\lim_{x \\to \\infty}', title: 'Limit at infinity' },
  { label: 'd/dx', snippet: '\\frac{d}{dx}', title: 'Derivative' },
  { label: "f'", snippet: "f'(x)", title: "f prime" },
  { sep: true },

  // ── Set notation ──
  { label: '∈', snippet: '\\in', title: 'Element of' },
  { label: '∉', snippet: '\\notin', title: 'Not element of' },
  { label: '⊂', snippet: '\\subset', title: 'Subset' },
  { label: '∪', snippet: '\\cup', title: 'Union' },
  { label: '∩', snippet: '\\cap', title: 'Intersection' },
  { label: '∅', snippet: '\\emptyset', title: 'Empty set' },
  { label: 'ℝ', snippet: '\\mathbb{R}', title: 'Real numbers' },
  { label: 'ℕ', snippet: '\\mathbb{N}', title: 'Natural numbers' },
  { label: 'ℤ', snippet: '\\mathbb{Z}', title: 'Integers' },
  { sep: true },

  // ── Constants & special ──
  { label: '∞', snippet: '\\infty', title: 'Infinity' },
  { label: '→', snippet: '\\to', title: 'Arrow (to)' },
  { label: '⇒', snippet: '\\Rightarrow', title: 'Implies' },
  { label: '⇔', snippet: '\\Leftrightarrow', title: 'If and only if' },
  { label: '∀', snippet: '\\forall', title: 'For all' },
  { label: '∃', snippet: '\\exists', title: 'There exists' },
  { sep: true },

  // ── Brackets & delimiters ──
  { label: '(…)', snippet: '\\left(  \\right)', cursor: 7, title: 'Auto-sized parentheses' },
  { label: '[…]', snippet: '\\left[  \\right]', cursor: 7, title: 'Auto-sized brackets' },
  { label: '{…}', snippet: '\\left\\{  \\right\\}', cursor: 8, title: 'Auto-sized braces' },
  { label: '|…|', snippet: '\\left|  \\right|', cursor: 7, title: 'Absolute value' },
  { sep: true },

  // ── Geometry ──
  { label: '∠', snippet: '\\angle', title: 'Angle' },
  { label: '△', snippet: '\\triangle', title: 'Triangle' },
  { label: '⊥', snippet: '\\perp', title: 'Perpendicular' },
  { label: '∥', snippet: '\\parallel', title: 'Parallel' },
  { label: '°', snippet: '^{\\circ}', title: 'Degree' },

  // ── Common patterns (exam-ready) ──
  { sep: true },
  { label: 'aₙ', snippet: 'a_{n}', title: 'Sequence term a_n' },
  { label: 'Sₙ', snippet: 'S_{n}', title: 'Partial sum S_n' },
  { label: 'C(n,k)', snippet: 'C_{n}^{k}', title: 'Combination' },
  { label: 'n!', snippet: 'n!', title: 'Factorial' },
  { label: '|x|', snippet: '|x|', title: 'Absolute value (simple)' },
  { label: 'vec', snippet: '\\vec{}', cursor: 5, title: 'Vector' },
  { label: '…', snippet: '\\cdots', title: 'Horizontal dots' },
  { label: '⋮', snippet: '\\vdots', title: 'Vertical dots' },
] as const
