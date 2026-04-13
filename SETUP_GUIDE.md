# Supabase 登录设置指南

## 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 并注册/登录
2. 点击 "New Project" 创建新项目
3. 填写项目信息并创建

## 2. 获取项目凭据

在项目设置中找到：
- **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
- **anon/public API key** (NEXT_PUBLIC_SUPABASE_ANON_KEY)

## 3. 配置环境变量

在 `.env.local` 文件中添加：

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 4. 设置数据库

1. 进入 Supabase Dashboard
2. 打开 SQL Editor
3. 执行 `supabase/schema.sql` 文件中的 SQL 语句

## 5. 启用邮箱认证

1. 进入 Authentication -> Providers
2. 启用 Email 提供程序
3. 配置认证设置（可选：禁用邮件确认以便快速测试）

## 6. 测试登录

1. 启动开发服务器 `npm run dev`
2. 访问登录页面 /auth
3. 注册新账户或使用现有账户登录
