/*
# Create YAAD database schema (single-tenant, no auth)

## Overview
Creates three tables for the YAAD AI Voice Memory Assistant app:
- `notes` — stores uploaded study notes (knowledge base) with file metadata and extracted text
- `chat_messages` — stores the conversation history between students and YAAD
- `streaks` — tracks daily usage streaks per device/session

Since YAAD is a no-sign-in single-tenant demo app, all tables use `TO anon, authenticated`
policies with `USING (true)` — the data is intentionally public/shared.

## New Tables

### 1. `notes`
- `id` (uuid, primary key)
- `filename` (text, not null) — original uploaded file name
- `file_type` (text) — MIME type or extension
- `file_size` (bigint) — size in bytes
- `content` (text) — extracted text content used as knowledge base
- `language` (text, default 'en') — language selected at upload time
- `created_at` (timestamptz, default now())

### 2. `chat_messages`
- `id` (uuid, primary key)
- `role` (text, not null) — 'user' or 'ai'
- `question` (text, not null) — the user's question
- `answer` (text) — the AI's answer (null for user messages)
- `source` (text) — citation source filename if available
- `language` (text, default 'en') — language used for the conversation
- `created_at` (timestamptz, default now())

### 3. `streaks`
- `id` (uuid, primary key)
- `session_key` (text, unique, not null) — device/session identifier
- `count` (integer, default 1) — current streak count
- `last_active` (date, default current_date) — last active date
- `updated_at` (timestamptz, default now())

## Security
- RLS enabled on all three tables.
- All tables allow full CRUD for `anon, authenticated` (no-auth single-tenant app).
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).

## Notes
1. No `user_id` columns or `auth.uid()` checks — the app has no sign-in screen.
2. `session_key` in `streaks` allows per-device tracking without accounts.
3. Indexes added on frequently queried columns.
*/

-- Notes table (uploaded study material / knowledge base)
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_type text,
  file_size bigint DEFAULT 0,
  content text DEFAULT '',
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select" ON notes;
CREATE POLICY "notes_select" ON notes FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "notes_insert" ON notes;
CREATE POLICY "notes_insert" ON notes FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notes_update" ON notes;
CREATE POLICY "notes_update" ON notes FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notes_delete" ON notes;
CREATE POLICY "notes_delete" ON notes FOR DELETE
TO anon, authenticated USING (true);

-- Chat messages table (conversation history)
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('user', 'ai')),
  question text NOT NULL,
  answer text,
  source text,
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_select" ON chat_messages;
CREATE POLICY "chat_select" ON chat_messages FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "chat_insert" ON chat_messages;
CREATE POLICY "chat_insert" ON chat_messages FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "chat_update" ON chat_messages;
CREATE POLICY "chat_update" ON chat_messages FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "chat_delete" ON chat_messages;
CREATE POLICY "chat_delete" ON chat_messages FOR DELETE
TO anon, authenticated USING (true);

-- Streaks table (daily usage tracking)
CREATE TABLE IF NOT EXISTS streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text UNIQUE NOT NULL,
  count integer NOT NULL DEFAULT 1,
  last_active date NOT NULL DEFAULT current_date,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "streaks_select" ON streaks;
CREATE POLICY "streaks_select" ON streaks FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "streaks_insert" ON streaks;
CREATE POLICY "streaks_insert" ON streaks FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "streaks_update" ON streaks;
CREATE POLICY "streaks_update" ON streaks FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "streaks_delete" ON streaks;
CREATE POLICY "streaks_delete" ON streaks FOR DELETE
TO anon, authenticated USING (true);

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_streaks_session_key ON streaks (session_key);
CREATE INDEX IF NOT EXISTS idx_streaks_last_active ON streaks (last_active DESC);
