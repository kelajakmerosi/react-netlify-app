const source = require('./milliy-sertifikat-math-2026-02-28-2-smena.source.json')

const PAPER_KEY = 'milliy-sertifikat-2026-02-28-2-smena'
const PAPER_TITLE = 'Milliy Sertifikat - Matematika (28.02.2026, 2-smena)'
const IMAGE_BASE = '/quiz-media/milliy/math-2026-02-28-2-smena'
const SOURCE_REF = `${source.test_metadata.author} ${source.test_metadata.date} ${source.test_metadata.session}`

const ANSWER_KEY_BY_ORDER = {
  1: 3,
  2: 0,
  3: 0,
  4: 1,
  5: 0,
  6: 0,
  7: 1,
  8: 1,
  9: 3,
  10: 1,
  11: 0,
  12: 2,
  13: 2,
  14: 3,
  15: 0,
  16: 2,
  17: 1,
  18: 2,
  19: 0,
  20: 2,
  21: 2,
  22: 1,
  23: 2,
  24: 2,
  25: 3,
  26: 3,
  27: 0,
  28: 0,
  29: 3,
  30: 3,
  31: 2,
  32: 2,
  33: 1,
  34: 4,
  35: 2,
}

const IMAGE_URL_BY_REFERENCE = {
  'page_5_triangle_diagram.png': `${IMAGE_BASE}/q24-geometry.svg`,
  'page_6_triangle_overlap.png': `${IMAGE_BASE}/q25-equilateral.svg`,
  'page_7_venn_diagram.png': `${IMAGE_BASE}/q31-venn.svg`,
}

const BLOCKS = [
  { blockOrder: 1, title: '1-bet (1-4-savollar)' },
  { blockOrder: 2, title: '2-bet (5-9-savollar)' },
  { blockOrder: 3, title: '3-bet (10-14-savollar)' },
  { blockOrder: 4, title: '4-bet (15-19-savollar)' },
  { blockOrder: 5, title: '5-bet (20-24-savollar)' },
  { blockOrder: 6, title: '6-bet (25-28-savollar)' },
  { blockOrder: 7, title: '7-bet (29-32-savollar)' },
  { blockOrder: 8, title: '8-bet (33-36-savollar)' },
  { blockOrder: 9, title: '9-bet (37-38-savollar)' },
  { blockOrder: 10, title: '10-bet (39-savol)' },
  { blockOrder: 11, title: '11-bet (40-savol)' },
  { blockOrder: 12, title: '12-bet (41-savol)' },
  { blockOrder: 13, title: '13-bet (42-savol)' },
  { blockOrder: 14, title: '14-bet (43-savol)' },
  { blockOrder: 15, title: '15-bet (44-45-savollar)' },
]

const resolveBlockOrder = (questionOrder) => {
  if (questionOrder <= 4) return 1
  if (questionOrder <= 9) return 2
  if (questionOrder <= 14) return 3
  if (questionOrder <= 19) return 4
  if (questionOrder <= 24) return 5
  if (questionOrder <= 28) return 6
  if (questionOrder <= 32) return 7
  if (questionOrder <= 36) return 8
  if (questionOrder <= 38) return 9
  if (questionOrder === 39) return 10
  if (questionOrder === 40) return 11
  if (questionOrder === 41) return 12
  if (questionOrder === 42) return 13
  if (questionOrder === 43) return 14
  return 15
}

const resolveImageUrl = (imageReference) => IMAGE_URL_BY_REFERENCE[imageReference] || null

const buildSourceRef = (questionOrder) => (
  `${SOURCE_REF}, ${BLOCKS[resolveBlockOrder(questionOrder) - 1].title}`
)

const buildBaseQuestion = (questionOrder, input, extra = {}) => ({
  questionOrder,
  blockOrder: resolveBlockOrder(questionOrder),
  promptText: input.text,
  promptRich: {
    sourceFormat: input.type,
    sourceQuestionId: input.id,
    imageReference: input.image_reference || null,
    original: input,
    metadata: source.test_metadata,
  },
  imageUrl: resolveImageUrl(input.image_reference),
  explanation: null,
  difficulty: input.type === 'open_ended' || input.type === 'matching' ? 'hard' : 'medium',
  sourceRef: buildSourceRef(questionOrder),
  ...extra,
})

const normalizeMultipleChoice = (question) => {
  const correctIndex = Object.prototype.hasOwnProperty.call(ANSWER_KEY_BY_ORDER, question.id)
    ? ANSWER_KEY_BY_ORDER[question.id]
    : 0

  return [buildBaseQuestion(question.id, question, {
    options: question.options.map((option) => option.value),
    correctIndex,
    keyVerified: Object.prototype.hasOwnProperty.call(ANSWER_KEY_BY_ORDER, question.id),
    formatType: question.options.length > 4 ? 'MCQ8' : 'MCQ4',
    writtenAnswer: null,
  })]
}

const normalizeMatching = (question) => (
  question.tasks.map((task, index) => buildBaseQuestion(Number(task.id), question, {
    promptText: `${question.text}\n\n${task.id}. ${task.text}`,
    promptRich: {
      sourceFormat: question.type,
      sourceQuestionId: question.id,
      taskId: task.id,
      taskText: task.text,
      sharedAnswers: question.answers,
      original: question,
      metadata: source.test_metadata,
    },
    options: question.answers.map((answer) => answer.value),
    correctIndex: Object.prototype.hasOwnProperty.call(ANSWER_KEY_BY_ORDER, Number(task.id))
      ? ANSWER_KEY_BY_ORDER[Number(task.id)]
      : 0,
    keyVerified: Object.prototype.hasOwnProperty.call(ANSWER_KEY_BY_ORDER, Number(task.id)),
    formatType: 'MCQ8',
    writtenAnswer: null,
    difficulty: index === 0 ? 'hard' : 'hard',
  }))
)

const normalizeOpenEnded = (question) => {
  const subQuestions = (question.sub_questions || []).map((item, index) => {
    const suffix = String(item.id || '').match(/[a-z]+$/i)?.[0] || String(index + 1)
    return `${suffix}) ${item.text}`
  })

  return [buildBaseQuestion(question.id, question, {
    promptText: `${question.text}\n\n${subQuestions.join('\n\n')}`,
    promptRich: {
      sourceFormat: question.type,
      sourceQuestionId: question.id,
      subQuestions: question.sub_questions || [],
      original: question,
      metadata: source.test_metadata,
    },
    options: [],
    correctIndex: null,
    keyVerified: false,
    formatType: 'WRITTEN',
    writtenAnswer: null,
    difficulty: 'hard',
  })]
}

const QUESTIONS = source.questions.flatMap((question) => {
  if (question.type === 'multiple_choice') return normalizeMultipleChoice(question)
  if (question.type === 'matching') return normalizeMatching(question)
  if (question.type === 'open_ended') return normalizeOpenEnded(question)
  return []
})

module.exports = {
  PAPER_KEY,
  PAPER_TITLE,
  BLOCKS,
  QUESTIONS,
  REQUIRED_QUESTION_COUNT: 45,
  STATUS: 'published',
  PRICE_UZS: 0,
  IS_ACTIVE: true,
  DESCRIPTION: 'Barcha 45 ta savol kiritildi. 36-45-savollar yozma formatda saqlandi; rasm assetlari saqlanib, yozma javoblar platformada alohida maydonda topshiriladi.',
}
