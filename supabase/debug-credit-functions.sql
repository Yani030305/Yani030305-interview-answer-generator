-- 诊断和修复积分扣除功能测试 SQL
-- 步骤1：先测试 deduct_credits 函数是否能正常调用

-- 1. 测试 deduct_credits 函数测试
-- 替换下面的 <用户UUID> 换成你的用户 ID
-- 执行下面的 SQL 来测试函数

-- 1.1 先查看当前用户的积分
SELECT id, email, credits FROM public.profiles WHERE id = '<用户UUID>';

-- 1.2 测试 deduct_credits 函数
-- 手动执行测试
DO $$
DECLARE
  test_user_id UUID := '<用户UUID>';
  result BOOLEAN;
BEGIN
  -- 尝试扣除积分
  SELECT public.deduct_credits(
    test_user_id,
    10,
    '测试扣除积分'
  ) INTO result;
  
  RAISE NOTICE 'deduct_credits result: %', result;
  
  -- 查看积分交易记录
  RAISE NOTICE '查看交易记录:';
END $$;

-- 1.3 查看交易记录
SELECT * FROM public.credit_transactions WHERE user_id = '<用户UUID>' ORDER BY created_at DESC LIMIT 5;

-- 2. 如果上面测试成功后，检查函数定义是否正确
-- 查看函数定义
SELECT proname, prosrc FROM pg_proc WHERE proname IN ('deduct_credits', 'add_credits', 'refund_credits');

-- 3. 如果函数调用格式是带 p_ 前缀版本的函数
-- 查看当前数据库中是否同时存在两个版本的函数？
SELECT proname, proargnames FROM pg_proc WHERE proname LIKE '%credits%';
