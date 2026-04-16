-- 创建删除用户的函数
CREATE OR REPLACE FUNCTION public.delete_user_by_email(user_email TEXT)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- 1. 根据邮箱获取用户ID
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- 2. 删除关联数据（按外键依赖顺序）
  DELETE FROM public.credit_transactions WHERE user_id = target_user_id;
  DELETE FROM public.answer_history WHERE user_id = target_user_id;
  DELETE FROM public.orders WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- 3. 注意：删除 auth.users 需要服务端权限
  -- 可以先在 Authentication → Users 界面手动删除
  -- 或者使用 Supabase Admin API
  
  RAISE NOTICE 'Successfully deleted user data for %', user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 使用示例（直接执行这个来删除指定用户）：
-- SELECT public.delete_user_by_email('121090467@link.cuhk.edu.cn');
