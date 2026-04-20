-- JD 分析历史表
CREATE TABLE IF NOT EXISTS jd_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  city TEXT,
  jd_text TEXT NOT NULL,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_jd_analysis_history_user_id ON jd_analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_jd_analysis_history_created_at ON jd_analysis_history(created_at);

-- 启用行级安全策略
ALTER TABLE jd_analysis_history ENABLE ROW LEVEL SECURITY;

-- 创建行级安全策略
CREATE POLICY "Users can view their own jd analysis history" ON jd_analysis_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jd analysis history" ON jd_analysis_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jd analysis history" ON jd_analysis_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jd analysis history" ON jd_analysis_history
  FOR DELETE USING (auth.uid() = user_id);