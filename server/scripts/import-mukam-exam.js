#!/usr/bin/env node
require('dotenv').config()
const path = require('path')
const { connectDB, pool } = require('../src/config/db')
const { importExamFromSource } = require('../src/services/ingestion/importExamFromSource')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const get = (name, fallback = '') => {
    const prefix = `--${name}=`
    const raw = args.find((entry) => entry.startsWith(prefix))
    return raw ? raw.slice(prefix.length) : fallback
  }

  return {
    sourcePath: get('sourcePath'),
    sourceType: get('sourceType', 'docx'),
    subjectId: get('subjectId'),
    title: get('title', 'Mukam import exam'),
    description: get('description', 'Imported from Mukam source'),
    ownerUserId: get('ownerUserId'),
    requiredQuestionCount: Number(get('requiredQuestionCount', '35')),
  }
}

const main = async () => {
  const payload = parseArgs()
  if (!payload.sourcePath || !payload.subjectId || !payload.ownerUserId) {
    // eslint-disable-next-line no-console
    console.error('Usage: node scripts/import-mukam-exam.js --sourcePath=... --subjectId=... --ownerUserId=... [--sourceType=docx|pdf] [--requiredQuestionCount=35]')
    process.exit(1)
  }

  await connectDB()
  const imported = await importExamFromSource({
    sourcePath: path.resolve(payload.sourcePath),
    sourceType: payload.sourceType,
    subjectId: payload.subjectId,
    title: payload.title,
    description: payload.description,
    ownerUserId: payload.ownerUserId,
    requiredQuestionCount: payload.requiredQuestionCount,
  })

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(imported, null, 2))
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end().catch(() => {})
  })
