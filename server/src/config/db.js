const { Pool } = require('pg');
const { logger } = require('./logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase
  max: 10,
  idleTimeoutMillis: 30000,
});

/**
 * Connect and verify the database is reachable.
 * Also runs table migrations on startup.
 */
const connectDB = async () => {
  try {
    const client = await pool.connect();
    const { rows } = await client.query('SELECT NOW()');
    client.release();
    logger.info({ now: rows[0].now }, '[db] PostgreSQL connected');
    await runMigrations();
  } catch (err) {
    logger.error({ err }, '[db] Connection error');
    process.exit(1);
  }
};

/**
 * Idempotent table setup — runs on every server start.
 */
const runMigrations = async () => {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      phone       TEXT UNIQUE,
      phone_verified BOOLEAN DEFAULT FALSE,
      password    TEXT,
      avatar      TEXT DEFAULT '',
      role        TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin', 'superadmin')),
      provider    TEXT DEFAULT 'local'   CHECK (provider IN ('local', 'google')),
      google_id   TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name TEXT,
      ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS can_teach BOOLEAN,
      ADD COLUMN IF NOT EXISTS can_buy BOOLEAN,
      ADD COLUMN IF NOT EXISTS can_learn BOOLEAN;

    UPDATE users
    SET can_teach = CASE WHEN role IN ('admin', 'superadmin') THEN TRUE ELSE FALSE END
    WHERE can_teach IS NULL;

    UPDATE users
    SET can_buy = TRUE
    WHERE can_buy IS NULL;

    UPDATE users
    SET can_learn = TRUE
    WHERE can_learn IS NULL;

    ALTER TABLE users
      ALTER COLUMN can_teach SET DEFAULT FALSE,
      ALTER COLUMN can_buy SET DEFAULT TRUE,
      ALTER COLUMN can_learn SET DEFAULT TRUE;

    ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check;

    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('student', 'admin', 'superadmin'));

    ALTER TABLE users
      ALTER COLUMN email DROP NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
      ON users(phone)
      WHERE phone IS NOT NULL;

    CREATE TABLE IF NOT EXISTS subjects (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon        TEXT DEFAULT '',
      color       TEXT DEFAULT '#6366f1',
      "order"     INT  DEFAULT 0,
      topics      JSONB DEFAULT '[]',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_subject_scopes (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id          TEXT NOT NULL,
      can_manage_content  BOOLEAN DEFAULT TRUE,
      can_manage_pricing  BOOLEAN DEFAULT FALSE,
      created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (admin_user_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS teacher_subject_scopes (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id          TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'blocked', 'pending')),
      approved_by         UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (teacher_user_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS user_lesson_progress (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id            TEXT NOT NULL,
      topic_id              TEXT NOT NULL,
      status                TEXT DEFAULT 'locked'
                            CHECK (status IN ('locked', 'inprogress', 'onhold', 'completed')),
      video_watched         BOOLEAN DEFAULT FALSE,
      quiz_score            INT,
      quiz_answers          JSONB DEFAULT '{}'::jsonb,
      quiz_submitted        BOOLEAN DEFAULT FALSE,
      mastery_score         INT,
      quiz_attempts         INT DEFAULT 0,
      time_on_task_sec      INT DEFAULT 0,
      resume_question_index INT DEFAULT 0,
      last_activity_at      TIMESTAMPTZ DEFAULT NOW(),
      completed_at          TIMESTAMPTZ,
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      updated_at            TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, subject_id, topic_id)
    );

    ALTER TABLE user_lesson_progress
      ADD COLUMN IF NOT EXISTS quiz_total_questions INT;

    CREATE TABLE IF NOT EXISTS user_quiz_attempts (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id       TEXT NOT NULL,
      topic_id         TEXT NOT NULL,
      quiz_score       INT NOT NULL,
      mastery_score    INT NOT NULL,
      total_questions  INT NOT NULL,
      quiz_answers     JSONB DEFAULT '{}'::jsonb,
      attempted_at     TIMESTAMPTZ DEFAULT NOW(),
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_activity_days (
      user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      activity_date DATE NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, activity_date)
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type  TEXT NOT NULL,
      user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
      subject_id  TEXT,
      topic_id    TEXT,
      source      TEXT,
      payload     JSONB DEFAULT '{}'::jsonb,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pricing_plans (
      key               TEXT PRIMARY KEY,
      title             TEXT NOT NULL,
      description       TEXT DEFAULT '',
      price_monthly_uzs NUMERIC(12,2) DEFAULT 0,
      is_active         BOOLEAN DEFAULT TRUE,
      features          JSONB DEFAULT '[]'::jsonb,
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS course_prices (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_id       TEXT NOT NULL UNIQUE,
      subject_title    TEXT DEFAULT '',
      price_uzs        NUMERIC(12,2) NOT NULL DEFAULT 0,
      is_active        BOOLEAN DEFAULT TRUE,
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
      payment_type     TEXT NOT NULL CHECK (payment_type IN ('subscription', 'course_purchase', 'exam_attempt_pack', 'material_pack')),
      plan_key         TEXT REFERENCES pricing_plans(key) ON DELETE SET NULL,
      subject_id       TEXT,
      amount_uzs       NUMERIC(12,2) NOT NULL CHECK (amount_uzs >= 0),
      provider         TEXT NOT NULL CHECK (provider IN ('payme', 'click', 'manual')),
      status           TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
      external_id      TEXT,
      payload          JSONB DEFAULT '{}'::jsonb,
      paid_at          TIMESTAMPTZ DEFAULT NOW(),
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE payments
      DROP CONSTRAINT IF EXISTS payments_payment_type_check;

    ALTER TABLE payments
      ADD CONSTRAINT payments_payment_type_check
      CHECK (payment_type IN ('subscription', 'course_purchase', 'exam_attempt_pack', 'material_pack'));

    CREATE TABLE IF NOT EXISTS exams (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_id      TEXT NOT NULL,
      owner_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title           TEXT NOT NULL,
      description     TEXT DEFAULT '',
      duration_sec    INT NOT NULL DEFAULT 7200 CHECK (duration_sec > 0),
      pass_percent    INT NOT NULL DEFAULT 80 CHECK (pass_percent >= 0 AND pass_percent <= 100),
      required_question_count INT NOT NULL DEFAULT 50 CHECK (required_question_count >= 1),
      status          TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
      price_uzs       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price_uzs >= 0),
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
      published_at    TIMESTAMPTZ,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exam_blocks (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      block_order     INT NOT NULL,
      title           TEXT NOT NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (exam_id, block_order)
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      block_id        UUID REFERENCES exam_blocks(id) ON DELETE SET NULL,
      question_order  INT NOT NULL,
      prompt_text     TEXT NOT NULL,
      prompt_rich     JSONB DEFAULT '{}'::jsonb,
      image_url       TEXT,
      options_json    JSONB NOT NULL DEFAULT '[]'::jsonb,
      correct_index   INT NOT NULL CHECK (correct_index >= 0),
      key_verified    BOOLEAN NOT NULL DEFAULT TRUE,
      explanation     TEXT,
      difficulty      TEXT,
      source_ref      TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (exam_id, question_order)
    );

    ALTER TABLE exams
      ADD COLUMN IF NOT EXISTS required_question_count INT;

    UPDATE exams
    SET required_question_count = 50
    WHERE required_question_count IS NULL;

    ALTER TABLE exams
      ALTER COLUMN required_question_count SET DEFAULT 50,
      ALTER COLUMN required_question_count SET NOT NULL;

    ALTER TABLE exams
      DROP CONSTRAINT IF EXISTS exams_required_question_count_check;

    ALTER TABLE exams
      ADD CONSTRAINT exams_required_question_count_check
      CHECK (required_question_count >= 1);

    ALTER TABLE exam_questions
      ADD COLUMN IF NOT EXISTS key_verified BOOLEAN;

    UPDATE exam_questions
    SET key_verified = TRUE
    WHERE key_verified IS NULL;

    ALTER TABLE exam_questions
      ALTER COLUMN key_verified SET DEFAULT TRUE,
      ALTER COLUMN key_verified SET NOT NULL;

    CREATE TABLE IF NOT EXISTS exam_entitlements (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exam_id           UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      attempts_total    INT NOT NULL DEFAULT 1 CHECK (attempts_total >= 1),
      attempts_used     INT NOT NULL DEFAULT 0 CHECK (attempts_used >= 0),
      attempts_remaining INT NOT NULL DEFAULT 1 CHECK (attempts_remaining >= 0),
      source_payment_id UUID UNIQUE REFERENCES payments(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exam_attempts (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entitlement_id  UUID NOT NULL REFERENCES exam_entitlements(id) ON DELETE CASCADE,
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      status          TEXT NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress', 'submitted', 'expired', 'canceled')),
      started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at      TIMESTAMPTZ NOT NULL,
      submitted_at    TIMESTAMPTZ,
      correct_count   INT DEFAULT 0,
      total_questions INT DEFAULT 0,
      score_percent   INT DEFAULT 0,
      passed          BOOLEAN DEFAULT FALSE,
      snapshot_json   JSONB DEFAULT '{}'::jsonb,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exam_attempt_answers (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      attempt_id      UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
      question_id     UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
      selected_index  INT,
      answered_at     TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (attempt_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS material_packs (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_id      TEXT NOT NULL,
      owner_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title           TEXT NOT NULL,
      description     TEXT DEFAULT '',
      price_uzs       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price_uzs >= 0),
      status          TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
      published_at    TIMESTAMPTZ,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS material_pack_assets (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pack_id         UUID NOT NULL REFERENCES material_packs(id) ON DELETE CASCADE,
      storage_key     TEXT NOT NULL,
      file_name       TEXT NOT NULL,
      mime_type       TEXT,
      size_bytes      BIGINT DEFAULT 0,
      checksum        TEXT,
      uploaded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS material_entitlements (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pack_id           UUID NOT NULL REFERENCES material_packs(id) ON DELETE CASCADE,
      source_payment_id UUID UNIQUE REFERENCES payments(id) ON DELETE SET NULL,
      granted_at        TIMESTAMPTZ DEFAULT NOW(),
      revoked_at        TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS content_upload_jobs (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      uploader_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id        TEXT NOT NULL,
      source_type       TEXT NOT NULL CHECK (source_type IN ('docx', 'pdf')),
      status            TEXT NOT NULL DEFAULT 'uploaded'
                        CHECK (status IN ('uploaded', 'parsed', 'needs_review', 'failed', 'published')),
      source_storage_key TEXT NOT NULL,
      parse_output_json JSONB DEFAULT '{}'::jsonb,
      error_json        JSONB DEFAULT '{}'::jsonb,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO pricing_plans (key, title, description, price_monthly_uzs, is_active, features)
    VALUES
      ('free', 'Free', 'Base plan with limited access', 0, TRUE, '[]'::jsonb),
      ('pro', 'Pro', 'Extended access for active learners', 99000, TRUE, '[]'::jsonb),
      ('premium', 'Premium', 'Full access to all current and future features', 199000, TRUE, '[]'::jsonb)
    ON CONFLICT (key) DO NOTHING;

    CREATE TABLE IF NOT EXISTS phone_auth_codes (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone         TEXT NOT NULL,
      code_hash     TEXT NOT NULL,
      expires_at    TIMESTAMPTZ NOT NULL,
      attempts      INT DEFAULT 0,
      max_attempts  INT DEFAULT 5,
      consumed_at   TIMESTAMPTZ,
      request_ip    TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE phone_auth_codes
      ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'legacy_login',
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

    ALTER TABLE phone_auth_codes
      DROP CONSTRAINT IF EXISTS phone_auth_codes_purpose_check;

    ALTER TABLE phone_auth_codes
      ADD CONSTRAINT phone_auth_codes_purpose_check
      CHECK (purpose IN ('signup', 'password_reset', 'legacy_password_setup', 'legacy_login'));

    CREATE INDEX IF NOT EXISTS idx_phone_auth_codes_phone_created
      ON phone_auth_codes(phone, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_phone_auth_codes_phone_purpose_created
      ON phone_auth_codes(phone, purpose, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_phone_auth_codes_phone_active
      ON phone_auth_codes(phone, expires_at DESC)
      WHERE consumed_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user
      ON user_lesson_progress(user_id);

    CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_last_activity
      ON user_lesson_progress(user_id, last_activity_at DESC);

    CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user
      ON user_quiz_attempts(user_id, attempted_at DESC);

    CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_topic
      ON user_quiz_attempts(user_id, subject_id, topic_id, attempted_at DESC);

    CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
      ON analytics_events(event_type, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_analytics_events_created
      ON analytics_events(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_analytics_events_subject_topic
      ON analytics_events(subject_id, topic_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_payments_status_paid_at
      ON payments(status, paid_at DESC);

    CREATE INDEX IF NOT EXISTS idx_payments_type_paid_at
      ON payments(payment_type, paid_at DESC);

    CREATE INDEX IF NOT EXISTS idx_payments_provider_paid_at
      ON payments(provider, paid_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_external
      ON payments(provider, external_id)
      WHERE external_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_admin_subject_scopes_admin
      ON admin_subject_scopes(admin_user_id, subject_id);

    CREATE INDEX IF NOT EXISTS idx_teacher_subject_scopes_teacher
      ON teacher_subject_scopes(teacher_user_id, subject_id, status);

    CREATE INDEX IF NOT EXISTS idx_exams_owner_status
      ON exams(owner_user_id, status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_exams_subject_status
      ON exams(subject_id, status, is_active);

    CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_order
      ON exam_questions(exam_id, question_order);

    CREATE INDEX IF NOT EXISTS idx_exam_entitlements_user_exam
      ON exam_entitlements(user_id, exam_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_exam
      ON exam_attempts(user_id, exam_id, started_at DESC);

    CREATE INDEX IF NOT EXISTS idx_material_packs_subject_status
      ON material_packs(subject_id, status, is_active);

    CREATE INDEX IF NOT EXISTS idx_material_entitlements_user
      ON material_entitlements(user_id, granted_at DESC);
  `);
  logger.info('[db] Migrations complete');
};

module.exports = { pool, connectDB };
