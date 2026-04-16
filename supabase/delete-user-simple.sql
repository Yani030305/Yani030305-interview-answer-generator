-- 删除用户所有数据的脚本
-- 使用方法：
-- 1. 将要删除的用户ID替换到下面的 'USER_ID_TO_DELETE' 位置
-- 2. 在Supabase SQL Editor中执行所有语句

-- 要删除的用户ID（请替换为实际的用户ID）
-- SET target_user_id = 'USER_ID_TO_DELETE';

-- 1. 删除请求日志（如果有）
DELETE FROM public.request_logs
WHERE user_id = 'USER_ID_TO_DELETE';

-- 2. 删除积分交易记录（如果有）
DELETE FROM public.credit_transactions
WHERE user_id = 'USER_ID_TO_DELETE';

-- 3. 删除订单（如果有）
DELETE FROM public.orders
WHERE user_id = 'USER_ID_TO_DELETE';

-- 4. 删除用户资料（如果有）
DELETE FROM public.profiles
WHERE id = 'USER_ID_TO_DELETE';

-- 5. 删除认证用户
DELETE FROM auth.users
WHERE id = 'USER_ID_TO_DELETE';

-- 执行完毕后，用户及其所有关联数据应该已被删除