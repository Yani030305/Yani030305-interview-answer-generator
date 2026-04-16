-- 清理重复的函数并统一参数格式
-- 步骤1：删除现有的所有函数

DROP FUNCTION IF EXISTS public.deduct_credits(UUID, INT, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.deduct_credits(UUID, INT, TEXT);
DROP FUNCTION IF EXISTS public.add_credits(UUID, INT, TEXT, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.refund_credits(UUID, INT, TEXT, UUID);

-- 步骤2：重新创建统一的函数（带 p_ 前缀）

-- deduct_credits 函数
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INT,
  p_description TEXT,
  p_order_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INT;
  rows_affected INT;
BEGIN
  SELECT credits INTO current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF current_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: % needed, % available', p_amount, current_credits;
  END IF;
  
  UPDATE public.profiles
  SET 
    credits = credits - p_amount,
    last_credit_check = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  IF rows_affected = 0 THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO public.credit_transactions (
    user_id, 
    amount, 
    type, 
    description,
    order_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id, 
    -p_amount, 
    'generation', 
    p_description,
    p_order_id,
    p_ip_address,
    p_user_agent
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- add_credits 函数
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INT,
  p_type TEXT,
  p_description TEXT,
  p_order_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INT;
BEGIN
  UPDATE public.profiles
  SET credits = credits + p_amount, updated_at = NOW()
  WHERE id = p_user_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  IF rows_affected = 0 THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO public.credit_transactions (
    user_id, 
    amount, 
    type, 
    description,
    order_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id, 
    p_amount, 
    p_type, 
    p_description,
    p_order_id,
    p_ip_address,
    p_user_agent
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- refund_credits 函数
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id UUID,
  p_amount INT,
  p_description TEXT,
  p_order_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.add_credits(
    p_user_id,
    p_amount,
    'refund',
    p_description,
    p_order_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 步骤3：验证函数是否正确创建
SELECT proname, proargnames FROM pg_proc 
WHERE proname IN ('deduct_credits', 'add_credits', 'refund_credits');
