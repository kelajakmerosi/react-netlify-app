const { pool } = require('../config/db');

// Topics are stored as JSONB inside the subjects row for flexibility.

const findAll = async () => {
  const { rows } = await pool.query(
    'SELECT * FROM subjects ORDER BY "order" ASC'
  );
  return rows;
};

const findById = async (id) => {
  const { rows } = await pool.query(
    'SELECT * FROM subjects WHERE id = $1 LIMIT 1', [id]
  );
  return rows[0] ?? null;
};

const create = async (data) => {
  const { title, description = '', icon = '', color = '#6366f1', order = 0, topics = [] } = data;
  const { rows } = await pool.query(
    `INSERT INTO subjects (title, description, icon, color, "order", topics)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, description, icon, color, order, JSON.stringify(topics)]
  );
  return rows[0];
};

const update = async (id, data) => {
  const { title, description, icon, color, order, topics } = data;
  const { rows } = await pool.query(
    `UPDATE subjects
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         icon  = COALESCE($3, icon),
         color = COALESCE($4, color),
         "order" = COALESCE($5, "order"),
         topics = COALESCE($6, topics),
         updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [title, description, icon, color, order, topics ? JSON.stringify(topics) : null, id]
  );
  return rows[0] ?? null;
};

const remove = async (id) => {
  const { rowCount } = await pool.query('DELETE FROM subjects WHERE id = $1', [id]);
  return rowCount > 0;
};

const replaceTopics = async (id, topics) => {
  const { rows } = await pool.query(
    `UPDATE subjects
     SET topics = $1::jsonb,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(topics || []), id]
  )
  return rows[0] ?? null
}

const addTopic = async (id, topic) => {
  const subject = await findById(id)
  if (!subject) return null

  const nextTopics = [...(subject.topics || []), topic]
  return replaceTopics(id, nextTopics)
}

const updateTopic = async (id, topicId, patch) => {
  const subject = await findById(id)
  if (!subject) return null
  const topics = subject.topics || []
  const nextTopics = topics.map((topic) => (
    topic.id === topicId ? { ...topic, ...patch } : topic
  ))

  if (!nextTopics.some((topic) => topic.id === topicId)) {
    return { subject, topicFound: false }
  }

  const updated = await replaceTopics(id, nextTopics)
  return { subject: updated, topicFound: true }
}

const removeTopic = async (id, topicId) => {
  const subject = await findById(id)
  if (!subject) return null
  const topics = subject.topics || []
  const nextTopics = topics.filter((topic) => topic.id !== topicId)
  if (nextTopics.length === topics.length) {
    return { subject, topicFound: false }
  }
  const updated = await replaceTopics(id, nextTopics)
  return { subject: updated, topicFound: true }
}

const reorderTopics = async (id, topicIds) => {
  const subject = await findById(id)
  if (!subject) return null

  const topics = subject.topics || []
  const byId = new Map(topics.map((topic) => [topic.id, topic]))
  const reordered = topicIds.map((topicId) => byId.get(topicId)).filter(Boolean)

  if (reordered.length !== topics.length) {
    return { subject, valid: false }
  }

  const updated = await replaceTopics(id, reordered)
  return { subject: updated, valid: true }
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  replaceTopics,
  addTopic,
  updateTopic,
  removeTopic,
  reorderTopics,
};
