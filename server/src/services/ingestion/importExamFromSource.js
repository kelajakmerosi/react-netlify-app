const Exam = require('../../models/Exam.model')
const { parseDocxSource } = require('./docx.parser')
const { parsePdfSource } = require('./pdf.parser')
const { buildMathFragments } = require('./math-fragment.mapper')

const QUESTION_START_REGEX = /^(\d{1,3})\s*[-.)]?\s*(?:savol|question)?\.?\s*(.*)$/i
const OPTION_REGEX = /^([A-DА-Г])[\)\].:,-]\s*(.+)$/i

const toPlaceholderOptions = (order) => ([
  `Variant 1 (${order})`,
  `Variant 2 (${order})`,
])

const buildPlaceholderQuestions = ({ requiredQuestionCount, sourceType, reason }) => {
  const safeCount = Number.isInteger(requiredQuestionCount) && requiredQuestionCount > 0
    ? requiredQuestionCount
    : 1

  return Array.from({ length: safeCount }, (_, idx) => {
    const order = idx + 1
    return {
      questionOrder: order,
      promptText: `Manual review required for question ${order}`,
      promptRich: {
        ingest: {
          sourceType,
          parseConfidence: 'low',
          needsManualReview: true,
          reason: reason || 'No structured question text extracted',
        },
      },
      options: toPlaceholderOptions(order),
      correctIndex: 0,
      keyVerified: false,
      sourceRef: `${sourceType}:import:placeholder`,
      difficulty: null,
      explanation: null,
      blockOrder: 1,
    }
  })
}

const parseQuestionsFromText = ({ text, sourceType, images }) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const parsed = []
  let current = null

  const flush = () => {
    if (!current) return
    const promptText = current.promptParts.join(' ').trim()
    const options = current.options.length >= 2 ? current.options : toPlaceholderOptions(current.questionOrder)
    const math = buildMathFragments({
      text: promptText,
      sourceType,
      images,
    })

    parsed.push({
      questionOrder: current.questionOrder,
      promptText: promptText || `Imported question ${current.questionOrder}`,
      promptRich: {
        ingest: {
          sourceType,
          parseConfidence: options.length >= 2 ? 'medium' : 'low',
          needsManualReview: true,
        },
        math,
      },
      options,
      correctIndex: 0,
      keyVerified: false,
      sourceRef: `${sourceType}:import`,
      difficulty: null,
      explanation: null,
      blockOrder: 1,
    })
    current = null
  }

  lines.forEach((line) => {
    const qMatch = line.match(QUESTION_START_REGEX)
    if (qMatch) {
      flush()
      current = {
        questionOrder: Number(qMatch[1]),
        promptParts: [qMatch[2] || ''],
        options: [],
      }
      return
    }

    if (!current) return

    const optionMatch = line.match(OPTION_REGEX)
    if (optionMatch) {
      current.options.push(optionMatch[2].trim())
      return
    }

    current.promptParts.push(line)
  })

  flush()

  const ordered = parsed
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .map((question, idx) => ({ ...question, questionOrder: idx + 1 }))

  return {
    blocks: [{ blockOrder: 1, title: 'Imported Questions' }],
    questions: ordered,
  }
}

const parseSource = async ({ sourceType, sourcePath }) => {
  if (sourceType === 'docx') return parseDocxSource(sourcePath)
  if (sourceType === 'pdf') return parsePdfSource(sourcePath)
  throw new Error(`Unsupported sourceType: ${sourceType}`)
}

const importExamFromSource = async ({
  sourceType,
  sourcePath,
  subjectId,
  title,
  description = '',
  ownerUserId,
  requiredQuestionCount = 35,
  priceUzs = 0,
}) => {
  const parsedSource = await parseSource({ sourceType, sourcePath })
  const structured = parseQuestionsFromText({
    text: parsedSource.text,
    sourceType,
    images: parsedSource.images,
  })

  if (!structured.questions.length && sourceType === 'pdf') {
    structured.questions = buildPlaceholderQuestions({
      requiredQuestionCount,
      sourceType,
      reason: parsedSource.warnings?.[0],
    })
  }

  if (!structured.questions.length) {
    throw new Error('No questions extracted from source document')
  }

  const exam = await Exam.createDraft({
    subjectId,
    ownerUserId,
    title,
    description,
    requiredQuestionCount,
    priceUzs,
  })

  await Exam.replaceStructure({
    examId: exam.id,
    blocks: structured.blocks,
    questions: structured.questions,
  })

  const validation = await Exam.validateExamStructure(exam.id)

  return {
    examId: exam.id,
    sourceWarnings: parsedSource.warnings,
    parsedQuestionCount: structured.questions.length,
    requiredQuestionCount,
    validation,
  }
}

module.exports = {
  importExamFromSource,
}
