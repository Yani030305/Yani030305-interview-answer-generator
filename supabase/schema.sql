-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  full_name TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create a trigger to create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone_number, session_id)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'phone_number', NULL);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create answer_history table for storing historical answer records
CREATE TABLE IF NOT EXISTS public.answer_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  question_id TEXT NOT NULL,
  answer_zh TEXT,
  answer_en TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.answer_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own answer history
DROP POLICY IF EXISTS "Users can read own answer history" ON public.answer_history;
CREATE POLICY "Users can read own answer history"
  ON public.answer_history FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own answer history
DROP POLICY IF EXISTS "Users can insert own answer history" ON public.answer_history;
CREATE POLICY "Users can insert own answer history"
  ON public.answer_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own answer history
DROP POLICY IF EXISTS "Users can update own answer history" ON public.answer_history;
CREATE POLICY "Users can update own answer history"
  ON public.answer_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own answer history
DROP POLICY IF EXISTS "Users can delete own answer history" ON public.answer_history;
CREATE POLICY "Users can delete own answer history"
  ON public.answer_history FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_answer_history_user_id ON public.answer_history(user_id);
CREATE INDEX IF NOT EXISTS idx_answer_history_question_id ON public.answer_history(question_id);
CREATE INDEX IF NOT EXISTS idx_answer_history_created_at ON public.answer_history(created_at DESC);
