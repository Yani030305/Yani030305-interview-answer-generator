-- Update profiles table with credits and unique email constraint
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits INT DEFAULT 0 NOT NULL;

-- Add unique constraint on email to prevent duplicate registrations
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a trigger to create a profile with 100 credits when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits)
  VALUES (new.id, new.email, 100);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create credit transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  amount INT NOT NULL,
  type TEXT NOT NULL, -- 'signup_bonus', 'generation', 'purchase', 'refund'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on credit transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own transactions
DROP POLICY IF EXISTS "Users can read own transactions" ON public.credit_transactions;
CREATE POLICY "Users can read own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Create function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_credits(user_id UUID, amount INT, description TEXT)
RETURNS VOID AS $$
DECLARE
  current_credits INT;
BEGIN
  SELECT credits INTO current_credits FROM public.profiles WHERE id = user_id;
  
  IF current_credits < amount THEN
    RAISE EXCEPTION 'Insufficient credits: % needed, % available', amount, current_credits;
  END IF;
  
  UPDATE public.profiles 
  SET credits = credits - amount, updated_at = NOW()
  WHERE id = user_id;
  
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (user_id, -amount, 'generation', description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add credits
CREATE OR REPLACE FUNCTION public.add_credits(user_id UUID, amount INT, type TEXT, description TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET credits = credits + amount, updated_at = NOW()
  WHERE id = user_id;
  
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (user_id, amount, type, description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Give existing users 100 credits (if any)
UPDATE public.profiles SET credits = 100 WHERE credits = 0;
