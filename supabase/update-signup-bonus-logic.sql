-- =====================================================
-- 更新注册赠送逻辑：统一 signup_bonus_given 语义
-- =====================================================

-- 1. 先删除触发器，再删除函数
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. 更新 handle_new_user 函数
-- 注册时直接发放 100 积分，并标记为已赠送
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建用户配置，直接发放 100 积分，并标记为已赠送
  -- 这样确保新用户注册时就能获得初始积分
  INSERT INTO public.profiles (id, email, phone_number, credits, signup_bonus_given)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'phone_number', 100, TRUE);
  
  -- 记录积分交易
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (new.id, 100, 'signup_bonus', '新用户注册赠送 100 积分');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 重新创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. 更新 give_signup_bonus 函数
-- 由于 handle_new_user 已经赠送了积分，这个函数现在主要用于向后兼容
-- 如果用户没有获得注册赠送，则补充赠送
CREATE OR REPLACE FUNCTION public.give_signup_bonus(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  bonus_given BOOLEAN;
BEGIN
  -- 检查是否已经赠送过
  SELECT signup_bonus_given INTO bonus_given
  FROM public.profiles
  WHERE id = user_id;
  
  -- 如果已经赠送过，返回 FALSE
  IF bonus_given THEN
    RETURN FALSE;
  END IF;
  
  -- 使用事务确保原子性
  BEGIN
    -- 更新 signup_bonus_given 标志
    UPDATE public.profiles
    SET signup_bonus_given = TRUE, updated_at = NOW()
    WHERE id = user_id AND signup_bonus_given = FALSE;
    
    -- 如果更新失败（已经被其他进程更新），返回 FALSE
    IF NOT FOUND THEN
      RETURN FALSE;
    END IF;
    
    -- 添加积分
    UPDATE public.profiles
    SET credits = credits + 100, updated_at = NOW()
    WHERE id = user_id;
    
    -- 记录交易
    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (user_id, 100, 'signup_bonus', '新用户注册赠送 100 积分');
    
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- 发生错误，回滚
      RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 修复历史数据：将已获得 100 积分但未标记的用户补全标记
UPDATE public.profiles
SET 
  signup_bonus_given = TRUE,
  updated_at = NOW()
WHERE credits >= 100 AND signup_bonus_given = FALSE;

-- 6. 为这些用户补充积分交易记录（如果不存在）
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

-- 7. 验证修复结果
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN signup_bonus_given = TRUE THEN 1 END) as bonus_given_true,
  COUNT(CASE WHEN signup_bonus_given = FALSE THEN 1 END) as bonus_given_false,
  COUNT(CASE WHEN credits >= 100 AND signup_bonus_given = FALSE THEN 1 END) as need_fix
FROM public.profiles;
