-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  reward NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  task_id UUID REFERENCES tasks(id),
  screenshot_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imgbb_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to approve task and credit user balance securely
CREATE OR REPLACE FUNCTION approve_task_submission(
  p_submission_id UUID,
  p_user_id UUID,
  p_reward NUMERIC
) RETURNS void AS $$
BEGIN
  -- Update submission status
  UPDATE submissions SET status = 'approved' WHERE id = p_submission_id;

  -- Add reward to user's auth metadata balance
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{balance}',
    to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + p_reward)
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tutorial_url TEXT;

CREATE TABLE IF NOT EXISTS recharges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  operator TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  offer_details TEXT,
  trx_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- For prototype purposes, disable RLS to make it easy to read/write from client
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE imgbb_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE recharges DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS gmail_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email_prefix TEXT NOT NULL,
  password TEXT NOT NULL,
  reward NUMERIC DEFAULT 5,
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'locked', 'submitted', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE gmail_tasks DISABLE ROW LEVEL SECURITY;
