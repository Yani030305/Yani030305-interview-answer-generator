-- 检查 RLS 策略诊断
-- 1. 先查看 credit_transactions 表的所有记录和 user_id
SELECT id, user_id, amount, type, description, created_at 
FROM public.credit_transactions 
ORDER BY created_at DESC 
LIMIT 20;

-- 2. 查看当前用户的所有交易记录（使用相同的查询方式）
SELECT * 
FROM public.credit_transactions 
WHERE user_id = 'd08798ac-ffad-4ecf-8899-7e0bea88f1da'
ORDER BY created_at DESC;

-- 3. 检查 RLS 策略是否启用
SELECT 
  tablename, 
  rowsecurity, 
  relrowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'credit_transactions';

-- 4. 查看 credit_transactions 表的 RLS 策略
SELECT * 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'credit_transactions';

-- 5. 临时禁用 RLS 测试（如果需要）
-- ALTER TABLE public.credit_transactions DISABLE ROW LEVEL SECURITY;

-- 6. 或者创建一个允许读取所有记录的策略（如果需要）
-- CREATE POLICY "Enable read access for all users"
-- ON public.credit_transactions
-- FOR SELECT
-- USING (true);
