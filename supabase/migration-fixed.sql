-- =====================================================
-- 修复版数据库迁移脚本
-- 解决了 payment_order_id 列问题
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
-- 先删除已存在的 orders 表（如果有问题）
DROP TABLE IF EXISTS public.orders CASCADE;

CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  package_id UUID REFERENCES public.credit_packages NOT NULL,
  package_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  credits INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_provider TEXT,
  payment_order_id TEXT,
  payment_transaction_id TEXT,
  payment_amount DECIMAL(10, 2),
  payment_method TEXT,
  error_message TEXT,
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
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 添加唯一约束，防止重复支付（使用 DO 块检查列是否存在）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_order_id') THEN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_order_id_key;
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_order_id_key UNIQUE (payment_order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_order_id ON public.orders(payment_order_id);
  END IF;
END $$;

-- =====================================================
-- 3. 创建 credit_transactions 表（积分交易记录）
-- =====================================================
DROP TABLE IF EXISTS public.credit_transactions CASCADE;

CREATE TABLE public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  amount INT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  order_id UUID REFERENCES public.orders,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 启用 RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- 创建策略
DROP POLICY IF EXISTS "Users can read own transactions" ON public.credit_transactions;
CREATE POLICY "Users can read own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_order_id ON public.credit_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at ON public.credit_transactions(user_id, created_at DESC);

-- =====================================================
-- 4. 确保 profiles 表有所有必要的列
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits INT DEFAULT 0 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_credit_check TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_bonus_given BOOLEAN DEFAULT FALSE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_signup_bonus_given ON public.profiles(signup_bonus_given);

-- =====================================================
-- 5. 更新 handle_new_user 函数
-- =====================================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, signup_bonus_given)
  VALUES (new.id, new.email, 0, FALSE);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 6. 创建注册赠送积分的函数
-- =====================================================
CREATE OR REPLACE FUNCTION public.give_signup_bonus(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  bonus_given BOOLEAN;
BEGIN
  SELECT signup_bonus_given INTO bonus_given
  FROM public.profiles
  WHERE id = user_id;
  
  IF bonus_given THEN
    RETURN FALSE;
  END IF;
  
  BEGIN
    UPDATE public.profiles
    SET signup_bonus_given = TRUE, updated_at = NOW()
    WHERE id = user_id AND signup_bonus_given = FALSE;
    
    IF NOT FOUND THEN
      RETURN FALSE;
    END IF;
    
    UPDATE public.profiles
    SET credits = credits + 100, updated_at = NOW()
    WHERE id = user_id;
    
    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (user_id, 100, 'signup_bonus', '新用户注册赠送 100 积分');
    
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. 创建 deduct_credits 函数
-- =====================================================
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
  SELECT credits INTO current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF current_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: % needed, % available', p_amount, current_credits;
  END IF;
  
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
-- 8. 创建 add_credits 函数
-- =====================================================
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
  UPDATE public.profiles
  SET credits = credits + p_amount, updated_at = NOW()
  WHERE id = p_user_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  IF rows_affected = 0 THEN
    RETURN FALSE;
  END IF;
  
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
-- 9. 创建 refund_credits 函数
-- =====================================================
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id UUID,
  p_amount INT,
  p_description TEXT,
  p_order_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
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
-- 10. 给现有用户补充注册赠送积分
-- =====================================================
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
-- 11. 创建请求日志表（用于风控和审计）
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
-- 12. 创建频率限制表
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
-- 13. 创建频率限制检查函数
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
-- 迁移完成！
-- =====================================================
-- 请继续执行以下步骤来恢复 API 代码：
-- 1. 在 Supabase SQL Editor 中运行此脚本
-- 2. 然后恢复 API 代码使用 RPC 函数
