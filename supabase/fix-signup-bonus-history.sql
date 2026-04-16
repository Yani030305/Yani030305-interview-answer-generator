-- =====================================================
-- 修复历史数据：将已获得 100 积分但未标记的用户补全标记
-- =====================================================

-- 1. 查看需要修复的数据
SELECT 
  id, 
  email, 
  credits, 
  signup_bonus_given,
  created_at
FROM public.profiles
WHERE credits >= 100 AND signup_bonus_given = FALSE
ORDER BY created_at DESC;

-- 2. 修复历史数据：将 credits >= 100 且 signup_bonus_given = FALSE 的用户标记为 TRUE
UPDATE public.profiles
SET 
  signup_bonus_given = TRUE,
  updated_at = NOW()
WHERE credits >= 100 AND signup_bonus_given = FALSE;

-- 3. 为这些用户补充积分交易记录（如果不存在）
-- 注意：这个操作可能会为已经存在交易记录的用户创建重复记录
-- 所以我们先检查是否已存在交易记录
INSERT INTO public.credit_transactions (user_id, amount, type, description)
SELECT 
  p.id, 
  100, 
  'signup_bonus', 
  '新用户注册赠送 100 积分'
FROM public.profiles p
WHERE p.credits >= 100 
  AND p.signup_bonus_given = TRUE
  AND NOT EXISTS (
    SELECT 1 
    FROM public.credit_transactions ct 
    WHERE ct.user_id = p.id 
      AND ct.type = 'signup_bonus' 
      AND ct.amount = 100
  );

-- 4. 验证修复结果
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN signup_bonus_given = TRUE THEN 1 END) as bonus_given_true,
  COUNT(CASE WHEN signup_bonus_given = FALSE THEN 1 END) as bonus_given_false,
  COUNT(CASE WHEN credits >= 100 AND signup_bonus_given = FALSE THEN 1 END) as need_fix
FROM public.profiles;

-- 5. 查看修复后的数据
SELECT 
  id, 
  email, 
  credits, 
  signup_bonus_given,
  created_at,
  updated_at
FROM public.profiles
WHERE credits >= 100
ORDER BY created_at DESC
LIMIT 20;
