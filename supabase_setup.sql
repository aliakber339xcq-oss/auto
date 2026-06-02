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

CREATE TABLE IF NOT EXISTS recharge_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE recharge_offers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS custom_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE custom_notifications DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  popup_enabled BOOLEAN DEFAULT false,
  popup_text TEXT,
  tutorial_url TEXT,
  review_url TEXT,
  telegram_url TEXT
);

ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;

INSERT INTO site_settings (popup_enabled, popup_text, tutorial_url, review_url, telegram_url)
SELECT false, 'Welcome to BDPay!', 'https://youtube.com', 'https://play.google.com', 'https://t.me'
WHERE NOT EXISTS (SELECT 1 FROM site_settings);

-- Referrals and profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  name TEXT,
  my_referral_code TEXT UNIQUE,
  referred_by_code TEXT,
  total_referrals INTEGER DEFAULT 0,
  bonuses_claimed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id),
  referred_user_id UUID REFERENCES auth.users(id) UNIQUE,
  reward_amount NUMERIC DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;

-- Function to ensure profile and handle referral signups
CREATE OR REPLACE FUNCTION ensure_user_profile(p_ref_code TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_my_code TEXT;
  v_referrer_id UUID;
  v_existing_ref UUID;
  v_reward NUMERIC := 15;
BEGIN
  -- Generate their own referral code if not exists
  v_my_code := UPPER(SUBSTRING(auth.uid()::text FROM 1 FOR 8));
  
  -- Insert profile if not exists
  INSERT INTO user_profiles (user_id, email, name, my_referral_code, referred_by_code)
  SELECT auth.uid(), auth.jwt()->>'email', auth.jwt()->>'name', v_my_code, p_ref_code
  WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid());

  -- If a referral code was passed, process it
  IF p_ref_code IS NOT NULL AND p_ref_code != '' THEN
    
    -- Check if referrer exists based on code
    SELECT user_id INTO v_referrer_id FROM user_profiles WHERE my_referral_code = p_ref_code AND user_id != auth.uid();
    
    IF v_referrer_id IS NOT NULL THEN
      -- Check if referral already recorded
      SELECT id INTO v_existing_ref FROM referrals WHERE referred_user_id = auth.uid();
      
      IF v_existing_ref IS NULL THEN
        -- Record the referral
        INSERT INTO referrals (referrer_id, referred_user_id, reward_amount) VALUES (v_referrer_id, auth.uid(), v_reward);
        
        -- Update referrer's total referrals
        UPDATE user_profiles SET total_referrals = total_referrals + 1 WHERE user_id = v_referrer_id;
        
        -- Reward referrer balance
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{balance}',
          to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + v_reward)
        )
        WHERE id = v_referrer_id;
      END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim milestone bonuses
CREATE OR REPLACE FUNCTION claim_referral_bonus(p_milestone INTEGER, p_bonus NUMERIC)
RETURNS boolean AS $$
DECLARE
  v_profile user_profiles;
BEGIN
  SELECT * INTO v_profile FROM user_profiles WHERE user_id = auth.uid();
  
  IF v_profile.total_referrals >= p_milestone THEN
    IF NOT (v_profile.bonuses_claimed ? p_milestone::text) THEN
      
      -- Record bonus as claimed
      UPDATE user_profiles 
      SET bonuses_claimed = bonuses_claimed || jsonb_build_array(p_milestone::text)
      WHERE user_id = auth.uid();
      
      -- Credit balance
      UPDATE auth.users
      SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{balance}',
        to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + p_bonus)
      )
      WHERE id = auth.uid();
      
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve gmail task and credit user balance securely
CREATE OR REPLACE FUNCTION approve_gmail_task(
  p_task_id UUID,
  p_user_id UUID,
  p_reward NUMERIC
) RETURNS void AS $$
BEGIN
  -- Update task status
  UPDATE gmail_tasks SET status = 'approved' WHERE id = p_task_id;

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
