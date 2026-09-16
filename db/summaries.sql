-- Saved Sift summaries. No migration framework in this repo — apply once with:
--   psql "$DATABASE_URL" -f db/summaries.sql
-- The ALTERs at the bottom make re-running safe on an older install.
CREATE TABLE IF NOT EXISTS summaries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  video_id    text NOT NULL,
  url         text NOT NULL,
  title       text NOT NULL DEFAULT '',
  tldr        text NOT NULL,
  topics      jsonb NOT NULL DEFAULT '[]',
  source      text NOT NULL CHECK (source IN ('captions','whisper')),
  language    text,
  audio       bytea,
  audio_state text CHECK (audio_state IN ('pending','ready','failed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);

-- Existing installs: NULL language/audio_state means "generate audio on demand".
ALTER TABLE summaries ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE summaries ADD COLUMN IF NOT EXISTS audio bytea;
ALTER TABLE summaries ADD COLUMN IF NOT EXISTS audio_state text CHECK (audio_state IN ('pending','ready','failed'));
