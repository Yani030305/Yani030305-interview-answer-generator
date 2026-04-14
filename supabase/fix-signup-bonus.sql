-- 修复新用户注册赠送积分问题
-- 这个迁移会更新 handle_new_user 函数，让它在创建用户时自动赠送 100 积分

-- 1. 更新 handle_new_user 函数（使用 CASCADE 选项）
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建用户配置，初始积分设为 100（注册赠送）
  INSERT INTO public.profiles (id, email, credits, signup_bonus_given)
  VALUES (new.id, new.email, 100, TRUE);
  
  -- 记录赠送积分的交易
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (new.id, 100, 'signup_bonus', '新用户注册赠送 100 积分');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 重新创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. 为现有用户补充赠送积分
-- 查找所有未赠送积分的用户并赠送 100 积分
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- 查找所有未赠送积分的用户
  FOR user_record IN 
    SELECT id FROM public.profiles WHERE signup_bonus_given = FALSE
  LOOP
    -- 调用赠送积分函数
    PERFORM public.give_signup_bonus(user_record.id);
  END LOOP;
END $$;
