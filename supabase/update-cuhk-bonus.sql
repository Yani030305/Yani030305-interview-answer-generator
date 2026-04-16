-- 更新触发器：CUHK邮箱（9位数字@link.cuhk.edu.cn）赠送500积分，其他用户赠送100积分

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_prefix TEXT;
  is_valid_cuhk BOOLEAN;
BEGIN
  -- 获取邮箱前缀
  email_prefix := SPLIT_PART(NEW.email, '@', 1);
  
  -- 检查是否为有效的CUHK邮箱（9位数字@link.cuhk.edu.cn）
  is_valid_cuhk := NEW.email LIKE '%@link.cuhk.edu.cn' AND email_prefix ~ '^\d{9}$';
  
  -- 创建用户资料，根据邮箱类型设置积分
  IF is_valid_cuhk THEN
    INSERT INTO public.profiles (id, email, credits)
    VALUES (NEW.id, NEW.email, 500);
    
    -- 记录积分交易
    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (NEW.id, 100, 'signup_bonus', '注册赠送');
    
    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (NEW.id, 400, 'signup_bonus', 'CUHK邮箱注册额外赠送');
  ELSE
    INSERT INTO public.profiles (id, email, credits)
    VALUES (NEW.id, NEW.email, 100);
    
    -- 记录积分交易
    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (NEW.id, 100, 'signup_bonus', '注册赠送');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
