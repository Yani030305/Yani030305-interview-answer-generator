-- =====================================================
-- 商业化 MVP 数据库迁移脚本
-- 创建时间: 2026-04-14
-- 说明: 将项目从 Demo 升级为可商业化 MVP
-- =====================================================

-- =====================================================
-- 1. 创建 credit_packages 表（积分套餐配置）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  credits INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  bonus INT DEFAULT 0,
  is_popular BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 插入默认套餐配置
INSERT INTO public.credit_packages (package_id, name, credits, price, original_price, bonus, is_popular, sort_order) VALUES
  ('basic', '基础套餐', 100, 4.9, NULL, 0, FALSE, 1),
  ('standard', '标准套餐', 500, 19.9, 24.5, 0, TRUE, 2),
  ('premium', '高级套餐', 1000, 34.9, 49, 50, FALSE, 3),
  ('professional', '专业套餐', 2000, 59.9, 98, 150, FALSE, 4),
  ('enterprise', '企业套餐', 5000, 149.9, 245, 500, FALSE, 5)
ON CONFLICT (package_id) DO NOTHING;

-- 启用 RLS
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- 所有人都可以查看套餐（公开信息）
DROP POLICY IF EXISTS "Anyone can read credit packages" ON public.credit_packages;
CREATE POLICY "Anyone can read credit packages"
  ON public.credit_packages FOR SELECT
  USING (is_active = TRUE);

-- 只有服务端可以修改套餐
DROP POLICY IF EXISTS "Service role can manage credit packages" ON public.credit_packages;
CREATE POLICY "Service role can manage credit packages"
  ON public.credit_packages FOR ALL
  USING (auth.role() = 'service_role');

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_credit_packages_package_id ON public.credit_packages(package_id);
CREATE INDEX IF NOT EXISTS idx_credit_packages_is_active ON public.credit_packages(is_active);

-- =====================================================
-- 2. 创建 orders 表（订单管理）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  package_id UUID REFERENCES public.credit_packages NOT NULL,
  package_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  credits INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed, refunded, cancelled
  payment_provider TEXT, -- wechat, alipay, tencent_cloud, etc.
  payment_order_id TEXT, -- 第三方支付订单号
  payment_transaction_id TEXT, -- 第三方支付交易号
  payment_amount DECIMAL(10, 2), -- 实际支付金额
  payment_method TEXT, -- 支付方式
  error_message TEXT, -- 错误信息
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 启用 RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的订单
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
CREATE POLICY "Users can read own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- 只有服务端可以创建订单
DROP POLICY IF EXISTS "Service role can create orders" ON public.orders;
CREATE POLICY "Service role can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 只有服务端可以更新订单
DROP POLICY IF EXISTS "Service role can update orders" ON public.orders;
CREATE POLICY "Service role can update orders"
  ON public.orders FOR UPDATE
  USING (auth.role() = 'service_role');

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_order_id ON public.orders(payment_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 添加唯一约束，防止重复支付
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_order_id_key;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_order_id_key UNIQUE (payment_order_id);

-- =====================================================
-- 3. 调整 credit_transactions 表
-- =====================================================
-- 添加 order_id 字段，关联订单
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders;

-- 添加 metadata 字段，存储额外信息
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 添加 IP 地址字段，用于风控
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- 添加 user_agent 字段，用于风控
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_credit_transactions_order_id ON public.credit_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at ON public.credit_transactions(user_id, created_at DESC);

-- =====================================================
-- 4. 调整 profiles 表
-- =====================================================
-- 添加 last_credit_check 字段，用于防止并发
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_credit_check TIMESTAMPTZ;

-- 添加 signup_bonus_given 字段，确保注册赠送只触发一次
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_bonus_given BOOLEAN DEFAULT FALSE;

-- 添加 phone_number 字段，用于手机号验证
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 添加唯一约束
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_signup_bonus_given ON public.profiles(signup_bonus_given);

-- =====================================================
-- 5. 更新 handle_new_user 函数，确保注册赠送只触发一次
-- =====================================================
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建用户配置，初始积分设为 0
  -- 注册赠送将通过单独的逻辑处理，确保幂等性
  INSERT INTO public.profiles (id, email, phone_number, credits, signup_bonus_given)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'phone_number', 0, FALSE);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 6. 创建注册赠送积分的函数（幂等）
-- =====================================================
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

-- =====================================================
-- 7. 更新 deduct_credits 函数，添加并发控制
-- =====================================================
DROP FUNCTION IF EXISTS public.deduct_credits(UUID, INT, TEXT);

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
  -- 使用 SELECT FOR UPDATE 锁定行，防止并发
  SELECT credits INTO current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- 检查积分是否足够
  IF current_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: % needed, % available', p_amount, current_credits;
  END IF;
  
  -- 扣除积分
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
  
  -- 记录交易
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

-- =====================================================
-- 8. 更新 add_credits 函数，添加订单关联
-- =====================================================
DROP FUNCTION IF EXISTS public.add_credits(UUID, INT, TEXT, TEXT);

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
  -- 添加积分
  UPDATE public.profiles
  SET credits = credits + p_amount, updated_at = NOW()
  WHERE id = p_user_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  IF rows_affected = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- 记录交易
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

-- =====================================================
-- 9. 创建退款函数
-- =====================================================
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id UUID,
  p_amount INT,
  p_description TEXT,
  p_order_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 调用 add_credits 函数
  RETURN public.add_credits(
    p_user_id,
    p_amount,
    'refund',
    p_description,
    p_order_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. 创建请求日志表（用于风控和审计）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.request_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  request_body JSONB,
  response_status INT,
  response_time_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 启用 RLS
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

-- 只有服务端可以访问
DROP POLICY IF EXISTS "Service role can manage request logs" ON public.request_logs;
CREATE POLICY "Service role can manage request logs"
  ON public.request_logs FOR ALL
  USING (auth.role() = 'service_role');

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON public.request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_endpoint ON public.request_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_request_logs_ip_address ON public.request_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON public.request_logs(created_at DESC);

-- =====================================================
-- 11. 创建频率限制表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- user_id 或 IP 地址
  endpoint TEXT NOT NULL,
  request_count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建唯一索引，确保同一标识符在同一时间窗口内只有一条记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint 
  ON public.rate_limits(identifier, endpoint, window_start);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

-- =====================================================
-- 12. 创建频率限制检查函数
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INT DEFAULT 10,
  p_window_minutes INT DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INT;
  window_end TIMESTAMPTZ;
BEGIN
  -- 计算时间窗口结束时间
  window_end := NOW() + (p_window_minutes || ' minutes')::INTERVAL;
  
  -- 清理过期的记录
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- 检查当前计数
  SELECT request_count INTO current_count
  FROM public.rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- 如果超过限制，返回 FALSE
  IF current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- 更新或插入记录
  INSERT INTO public.rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, NOW())
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. 给现有用户补充注册赠送积分
-- =====================================================
-- 为所有未获得注册赠送的用户补充积分
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM public.profiles WHERE signup_bonus_given = FALSE
  LOOP
    PERFORM public.give_signup_bonus(user_record.id);
  END LOOP;
END $$;

-- =====================================================
-- 14. 创建视图：用户积分统计
-- =====================================================
CREATE OR REPLACE VIEW public.user_credit_stats AS
SELECT 
  p.id AS user_id,
  p.email,
  p.credits,
  p.signup_bonus_given,
  COUNT(ct.id) AS total_transactions,
  SUM(CASE WHEN ct.amount > 0 THEN ct.amount ELSE 0 END) AS total_earned,
  SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END) AS total_spent,
  MAX(ct.created_at) AS last_transaction_at
FROM public.profiles p
LEFT JOIN public.credit_transactions ct ON p.id = ct.user_id
GROUP BY p.id, p.email, p.credits, p.signup_bonus_given;

-- =====================================================
-- 15. 创建视图：订单统计
-- =====================================================
CREATE OR REPLACE VIEW public.order_stats AS
SELECT 
  DATE(created_at) AS order_date,
  status,
  COUNT(*) AS order_count,
  SUM(price) AS total_amount,
  SUM(credits) AS total_credits
FROM public.orders
GROUP BY DATE(created_at), status
ORDER BY order_date DESC;

-- =====================================================
-- 迁移完成提示
-- =====================================================
-- 请在 Supabase SQL Editor 中执行此脚本
-- 执行完成后，请验证：
-- 1. 所有表都已创建
-- 2. RLS 策略已启用
-- 3. 索引已创建
-- 4. 函数已创建
-- 5. 现有用户已获得注册赠送积分
