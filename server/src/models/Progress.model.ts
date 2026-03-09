import { pool } from '../config/db';

const normalizeDateKey = (value: any) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const findOne = async (userId: any, subjectId: any, topicId: any) => {
  const { rows } = await pool.query(
    `SELECT *
     FROM user_lesson_progress
     WHERE user_id = $1::uuid AND subject_id = $2::text AND topic_id = $3
     LIMIT 1`,
    [userId, subjectId, topicId]
  );
  return rows[0] ?? null;
};

const listByUser = async (userId: any) => {
  const { rows } = await pool.query(
    `SELECT *
     FROM user_lesson_progress
     WHERE user_id = $1::uuid
     ORDER BY last_activity_at DESC NULLS LAST`,
    [userId]
  );
  return rows;
};

const listAttemptsByUser = async (userId: any) => {
  const { rows } = await pool.query(
    `SELECT *
     FROM user_quiz_attempts
     WHERE user_id = $1::uuid
     ORDER BY attempted_at DESC`,
    [userId]
  );
  return rows;
};

const markActivityDay = async (userId: any, at: any = new Date()) => {
  const day = normalizeDateKey(at);
  if (!day) return;

  await pool.query(
    `INSERT INTO user_activity_days (user_id, activity_date)
     VALUES ($1, $2::date)
     ON CONFLICT (user_id, activity_date) DO NOTHING`,
    [userId, day]
  );
};

const listActivityDays = async (userId: any) => {
  const { rows } = await pool.query(
    `SELECT activity_date
     FROM user_activity_days
     WHERE user_id = $1::uuid
     ORDER BY activity_date DESC`,
    [userId]
  );
  return rows.map((row: any) => normalizeDateKey(row.activity_date)).filter(Boolean);
};

const getStreakDays = async (userId: any) => {
  const dayKeys = await listActivityDays(userId);
  if (dayKeys.length === 0) return 0;

  const daySet = new Set(dayKeys);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  let streak = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const toPublicProgress = (row: any) => ({
  status: row.status,
  videoWatched: row.video_watched,
  quizScore: row.quiz_score,
  quizTotalQuestions: row.quiz_total_questions,
  quizAnswers: row.quiz_answers || {},
  quizSubmitted: row.quiz_submitted,
  masteryScore: row.mastery_score,
  quizAttempts: row.quiz_attempts,
  timeOnTaskSec: row.time_on_task_sec,
  resumeQuestionIndex: row.resume_question_index,
  lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at).getTime() : null,
  completedAt: row.completed_at ? new Date(row.completed_at).getTime() : null,
});

const toPublicAttempt = (row: any) => ({
  id: row.id,
  score: row.quiz_score,
  totalQuestions: row.total_questions,
  masteryScore: row.mastery_score,
  attemptedAt: new Date(row.attempted_at).getTime(),
});

const recordQuizAttempt = async (userId: any, subjectId: any, topicId: any, payload: any) => {
  const {
    score,
    masteryScore,
    totalQuestions,
    answers,
    attemptedAt,
  } = payload;

  if (!Number.isFinite(score) || !Number.isFinite(totalQuestions)) return;

  await pool.query(
    `INSERT INTO user_quiz_attempts (
       user_id,
       subject_id,
       topic_id,
       quiz_score,
       mastery_score,
       total_questions,
       quiz_answers,
       attempted_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
    [
      userId,
      subjectId,
      topicId,
      Math.max(0, Number(score)),
      Math.max(0, Number(masteryScore) || 0),
      Math.max(1, Number(totalQuestions)),
      JSON.stringify(answers ?? {}),
      attemptedAt ? new Date(attemptedAt) : new Date(),
    ]
  );
};

const upsert = async (userId: any, subjectId: any, topicId: any, patch: any = {}) => {
  const current = await findOne(userId, subjectId, topicId);

  const status = patch.status ?? current?.status ?? 'inprogress';
  const videoWatched = patch.videoWatched ?? current?.video_watched ?? false;
  const quizScore = patch.quizScore ?? current?.quiz_score ?? null;
  const quizTotalQuestions = patch.quizTotalQuestions ?? current?.quiz_total_questions ?? null;
  const quizAnswers = patch.quizAnswers ?? current?.quiz_answers ?? {};
  const quizSubmitted = patch.quizSubmitted ?? current?.quiz_submitted ?? false;
  const masteryScore = patch.masteryScore ?? current?.mastery_score ?? null;
  const quizAttempts = patch.quizAttempts ?? current?.quiz_attempts ?? 0;
  const timeOnTaskSec = patch.timeOnTaskSec ?? current?.time_on_task_sec ?? 0;
  const resumeQuestionIndex = patch.resumeQuestionIndex ?? current?.resume_question_index ?? 0;
  const lastActivityAt = patch.lastActivityAt ? new Date(patch.lastActivityAt) : new Date();

  const completedAt = patch.completedAt
    ? new Date(patch.completedAt)
    : status === 'completed'
      ? (current?.completed_at ?? new Date())
      : null;

  const { rows } = await pool.query(
    `INSERT INTO user_lesson_progress (
       user_id,
       subject_id,
       topic_id,
       status,
       video_watched,
       quiz_score,
       quiz_total_questions,
       quiz_answers,
       quiz_submitted,
       mastery_score,
       quiz_attempts,
       time_on_task_sec,
       resume_question_index,
       last_activity_at,
       completed_at,
       updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, NOW()
     )
     ON CONFLICT (user_id, subject_id, topic_id)
     DO UPDATE SET
       status = EXCLUDED.status,
       video_watched = EXCLUDED.video_watched,
       quiz_score = EXCLUDED.quiz_score,
       quiz_total_questions = EXCLUDED.quiz_total_questions,
       quiz_answers = EXCLUDED.quiz_answers,
       quiz_submitted = EXCLUDED.quiz_submitted,
       mastery_score = EXCLUDED.mastery_score,
       quiz_attempts = EXCLUDED.quiz_attempts,
       time_on_task_sec = EXCLUDED.time_on_task_sec,
       resume_question_index = EXCLUDED.resume_question_index,
       last_activity_at = EXCLUDED.last_activity_at,
       completed_at = EXCLUDED.completed_at,
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      subjectId,
      topicId,
      status,
      videoWatched,
      quizScore,
      quizTotalQuestions,
      JSON.stringify(quizAnswers ?? {}),
      quizSubmitted,
      masteryScore,
      quizAttempts,
      timeOnTaskSec,
      resumeQuestionIndex,
      lastActivityAt,
      completedAt,
    ]
  );

  await markActivityDay(userId, lastActivityAt);

  const shouldRecordAttempt = patch.quizSubmitted === true && Number.isFinite(Number(quizScore));
  if (shouldRecordAttempt) {
    await recordQuizAttempt(userId, subjectId, topicId, {
      score: Number(quizScore),
      masteryScore: Number(masteryScore) || 0,
      totalQuestions: Number(quizTotalQuestions) || 10,
      answers: quizAnswers ?? {},
      attemptedAt: lastActivityAt,
    });
  }

  return rows[0];
};

const buildProgressPayload = async (userId: any) => {
  const [rows, attemptRows] = await Promise.all([
    listByUser(userId),
    listAttemptsByUser(userId),
  ]);

  const attemptsByTopic = attemptRows.reduce((acc, row) => {
    const key = `${row.subject_id}_${row.topic_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(toPublicAttempt(row));
    return acc;
  }, {});

  const topicProgress = rows.reduce((acc, row) => {
    const key = `${row.subject_id}_${row.topic_id}`;
    acc[key] = {
      ...toPublicProgress(row),
      quizAttemptHistory: attemptsByTopic[key] ?? [],
    };
    return acc;
  }, {});

  const attemptHistoryEntries = attemptRows.map((row: any) => ({
    subjectId: row.subject_id,
    topicId: row.topic_id,
    quizScore: row.quiz_score,
    timestamp: new Date(row.attempted_at).getTime(),
  }));

  const activityEntries = rows
    .filter((row: any) => row.last_activity_at)
    .map((row: any) => ({
      subjectId: row.subject_id,
      topicId: row.topic_id,
      quizScore: row.quiz_score ?? undefined,
      timestamp: new Date(row.last_activity_at).getTime(),
    }));

  const lessonHistory = [...attemptHistoryEntries, ...activityEntries]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((entry, idx, all) => {
      const prev = all[idx - 1];
      if (
        prev &&
        prev.subjectId === entry.subjectId &&
        prev.topicId === entry.topicId &&
        Math.abs(prev.timestamp - entry.timestamp) < 1000
      ) {
        return null;
      }
      return entry;
    })
    .filter(Boolean)
    .slice(0, 80);

  const lastActivityAt = rows
    .map((row: any) => (row.last_activity_at ? new Date(row.last_activity_at).getTime() : 0))
    .reduce((max, ts) => (ts > max ? ts : max), 0);

  const timeOnTaskSec = rows.reduce((sum, row) => sum + (row.time_on_task_sec || 0), 0);
  const streakDays = await getStreakDays(userId);

  return {
    topicProgress,
    lessonHistory,
    metrics: {
      streakDays,
      timeOnTaskSec,
      lastActivityAt: lastActivityAt || null,
    },
  };
};

const findCompletedSubjectsByUserId = async (userId: any) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT s.id, s.title, MAX(p.completed_at) as last_completed_at
     FROM user_lesson_progress p
     JOIN subjects s ON p.subject_id = s.id::text
     WHERE p.user_id = $1::uuid AND p.status = 'completed'
     GROUP BY s.id, s.title
     ORDER BY last_completed_at DESC`,
    [userId]
  );
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    lastCompletedAt: r.last_completed_at,
  }));
};

const Progress = {
  findOne,
  listByUser,
  listAttemptsByUser,
  markActivityDay,
  getStreakDays,
  upsert,
  toPublicProgress,
  buildProgressPayload,
  findCompletedSubjectsByUserId,
}
export default Progress;
