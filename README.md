# HireMind AI 面试助手

智能面试助手，上传简历生成个性化面试回答

## 环境变量配置

创建 `.env.local` 文件并填入以下配置：

```env
# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ZPAY 支付配置
ZPAY_PID=your_zpay_pid
ZPAY_KEY=your_zpay_key
ZPAY_GATEWAY=your_zpay_gateway
ZPAY_NOTIFY_URL=https://yourdomain.com/api/payment/callback
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
# 可选
# ZPAY_CID=your_zpay_cid
```

## 安装与运行

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build

# 运行生产版本
npm start
```

## 功能说明

### 核心功能

1. **上传文档**: 支持 PDF、DOCX、TXT、MD 格式和图片文件
2. **选择模式**: 校招生模式 / 社招模式
3. **生成回答**: 点击问题卡片生成个性化双语回答
4. **编辑回答**: 直接编辑生成的内容
5. **导出文档**: 一键导出所有问答为 DOCX 或 Markdown 文件
6. **历史记录**: 查看、复制、删除和替代当前内容的历史生成记录
7. **状态标识**: 显示问题的生成状态（未生成、历史生成、当前生成、生成中、生成失败、排队中）
8. **智能排队**: 当多个问题同时生成时，自动排队处理

### 积分与支付

9. **积分系统**: 生成回答和导出文档需要消耗积分
10. **支付充值**: 支持 ZPAY 支付，扫码充值积分
11. **积分使用记录**: 查看积分交易历史，包括充值、消费、赠送等记录
12. **充值历史**: 查看充值订单历史，显示订单号、金额、积分等信息

### 高级功能

13. **深度岗位拆解**: 输入公司名称、岗位名称、城市和岗位描述，AI 深度分析岗位职责、能力要求和发展前景（消耗50积分）
14. **岗位拆解历史**: 查看历史岗位拆解记录，支持查看详情
15. **问题反馈**: 提交功能建议、Bug 报告或其他问题

### 用户管理

16. **注册功能**: 支持邮箱和手机号注册，邮箱和手机号唯一约束
17. **CUHK邮箱赠送**: 香港中文大学邮箱（@link.cuhk.edu.cn）注册赠送500积分
18. **单设备登录**: 一个账号同时只能在一个设备上登录
19. **一键生成全部回答**: 一次性生成所有问题的回答，享受优惠价格（999积分）

## 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS
- **后端**: Supabase (数据库、认证、边缘函数)
- **AI 服务**: DeepSeek API
- **支付服务**: ZPAY
- **工具库**: lucide-react, @radix-ui, docx.js

## 项目结构

```
/src
  /app              # 应用路由
    /api            # API 接口
      /auth         # 认证接口
      /analyze-jd   # 岗位拆解接口
      /documents    # 文档接口
      /generate-answer  # 生成回答接口
      /answer-history   # 历史记录接口
      /jd-analysis-history  # 岗位拆解历史接口
      /credits      # 积分接口
      /credit-packages  # 积分套餐接口
      /orders       # 订单接口
      /payment      # 支付接口
      /export       # 导出接口
      /feedback     # 问题反馈接口
    /recharge       # 充值页面
    /jd-analysis    # 岗位拆解页面
    /jd-analysis-history  # 岗位拆解历史页面
    /auth           # 认证页面
  /components       # 组件
  /lib              # 工具函数
  /services         # 服务
  /store            # 状态管理
  /types            # 类型定义
  /data             # 问题数据
```

## 核心功能模块

- **AnswerCard**: 回答卡片组件，包含生成、编辑、复制等功能
- **AnswerHistory**: 历史记录组件，实现查看、复制、删除、替代功能
- **QuestionNav**: 问题导航组件，显示问题列表和状态标识
- **FileUploader**: 文件上传组件，支持多种文件格式
- **Sidebar**: 侧边栏组件，包含批量生成和问题反馈功能
- **FeedbackForm**: 问题反馈表单组件，提交用户反馈
- **JobDescriptionUploader**: 岗位描述上传组件，支持深度岗位拆解
- **JDAnalysisDetailDialog**: 岗位拆解详情弹窗
- **AI Service**: AI 服务集成，使用 DeepSeek API 生成回答
- **Supabase Integration**: 数据库操作和用户认证
- **Payment Integration**: ZPAY 支付集成，订单管理

## 数据库表结构

- **profiles**: 用户信息表，包含积分、会话ID、手机号等
- **documents**: 文档表，存储上传的文档信息
- **answer_history**: 回答历史表，存储生成的回答
- **jd_analyses**: 岗位拆解历史表，存储岗位拆解结果
- **credit_transactions**: 积分交易表，记录积分变动
- **credit_packages**: 积分套餐表，定义充值套餐
- **orders**: 订单表，存储支付订单信息
- **request_logs**: 请求日志表，记录API请求日志
- **feedback**: 反馈表，存储用户提交的问题反馈

## 岗位拆解功能说明

### 功能入口

用户可以在首页找到"岗位描述 (JD)"模块，输入以下信息进行深度岗位拆解：

- **公司名称**: 目标公司名称
- **岗位名称**: 目标岗位名称
- **城市**: 工作地点（可选）
- **岗位描述**: 粘贴或输入岗位描述内容

### 分析结果

深度岗位拆解会返回以下分析结果：

1. **岗位一句话判断**: 用简洁精准的语言概括岗位核心价值
2. **岗位类型**: 判断岗位属于哪个大类（技术/产品/运营/市场等）
3. **关键职责**: 深度解读岗位描述中的职责，揭示背后的真实工作内容
4. **能力要求**:
   - 必备能力: 岗位必须具备的核心能力
   - 加分能力: 有助于获得优势的额外能力

### 积分消耗

- 单次深度岗位拆解: 50积分
- 支持上传简历获取更精准的匹配分析（可选）

### 历史记录

- 岗位拆解记录自动保存到历史
- 支持查看历史拆解详情
- 方便对比不同公司的岗位要求

## 使用说明

### 基础面试准备

1. 注册并登录账号
2. 上传简历、作品集等文档
3. 选择校招生或社招模式
4. 浏览问题列表，点击问题卡片生成回答
5. 编辑和优化生成的回答
6. 查看历史生成记录，管理和使用历史回答
7. 导出所有问答为文档
8. 当积分不足时，充值购买积分
9. 使用一键生成全部回答功能，一次性生成所有问题的回答
10. 通过问题反馈功能提交建议或报告问题

### 深度岗位拆解

1. 在首页找到"岗位描述 (JD)"模块
2. 输入公司名称、岗位名称
3. 粘贴岗位描述内容
4. 点击"深度岗位拆解"按钮
5. 查看分析结果，包括一句话判断、岗位类型、关键职责和能力要求
6. 点击"查看详情"获取完整分析报告
7. 在岗位拆解历史页面回顾历史记录

### 支付流程

1. 在充值页面选择积分套餐
2. 点击"立即购买"创建订单
3. 显示支付二维码，扫码支付
4. 支付成功后，系统自动添加积分
5. 可在订单列表查看支付状态

## 安全特性

- **单设备登录**: 通过 session_id 实现单设备登录限制
- **服务端鉴权**: 所有API接口从服务端session获取用户身份
- **积分并发控制**: 使用数据库事务和行级锁确保积分扣除的原子性
- **支付签名验证**: 验证ZPAY回调签名，确保支付安全
- **频率限制**: 防止API接口被恶意调用
- **Token缓存优化**: 前端缓存认证Token，避免重复请求导致超时

## 注意事项

- 生成回答和导出文档需要消耗积分
- 上传的文档会被用于生成个性化回答
- 历史记录会自动保存，支持去重功能
- 深度岗位拆解需要50积分
- 建议上传简历以获得更精准的匹配分析
- 一个账号同时只能在一个设备上登录
- 支付成功后积分会自动到账
- 一键生成全部回答享受优惠价格，只需999积分

## 开发环境

- Node.js 18+
- npm 9+
- Supabase CLI (可选，用于本地开发)

## 部署

1. 构建生产版本：`npm run build`
2. 启动生产服务器：`npm start`
3. 配置环境变量
4. 配置域名和SSL证书
5. 配置ZPAY回调URL

## 许可证

MIT License
