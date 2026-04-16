-- 删除用户所有数据的脚本
-- 使用方法：将下面的 'USER_ID_TO_DELETE' 替换为要删除的用户ID，然后在Supabase SQL Editor中执行

-- 要删除的用户ID
DECLARE
  target_user_id UUID := 'USER_ID_TO_DELETE';
BEGIN
  -- 1. 删除请求日志（如果有）
  DELETE FROM public.request_logs
  WHERE user_id = target_user_id;
  
  -- 2. 删除积分交易记录（如果有）
  DELETE FROM public.credit_transactions
  WHERE user_id = target_user_id;
  
  -- 3. 删除订单（如果有）
  DELETE FROM public.orders
  WHERE user_id = target_user_id;
  
  -- 4. 删除用户资料（如果有）
  DELETE FROM public.profiles
  WHERE id = target_user_id;
  
  -- 5. 删除认证用户
  DELETE FROM auth.users
  WHERE id = target_user_id;
  
  RAISE NOTICE '用户 % 及其所有数据已删除', target_user_id;
END;