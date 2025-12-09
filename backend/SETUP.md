# 后端项目配置指南

## 前置要求

1. **Node.js**: 版本 >= 18.0.0
2. **MySQL**: 版本 >= 8.0
3. **npm**: Node.js 自带

## 安装步骤

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置数据库

#### 启动 MySQL 服务

确保 MySQL 服务已启动。

Windows:
```bash
# 启动 MySQL 服务
net start mysql
```

Linux/Mac:
```bash
sudo service mysql start
# 或
sudo systemctl start mysql
```

#### 创建数据库

登录 MySQL 并创建数据库：

```bash
mysql -u root -p
```

然后执行：

```sql
CREATE DATABASE IF NOT EXISTS image_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

或者直接运行 SQL 文件：

```bash
mysql -u root -p < scripts/setup-db.sql
```

### 3. 配置环境变量

编辑 `.env` 文件，修改数据库连接信息：

```bash
# Database - 修改为你的数据库配置
DATABASE_URL="mysql://root:你的密码@localhost:3306/image_management"

# JWT
JWT_SECRET="image-management-secret-key-2025"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=development

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# AI Configuration (必需，用于 AI 分析功能)
# 如果不配置，AI 分析功能将无法使用
AI_API_KEY=your_api_key_here
AI_MODEL=your_model_name_here
```

**重要**: 
- 请将 `你的密码` 替换为你的 MySQL root 用户密码！
- **AI 分析功能需要配置 `AI_API_KEY` 和 `AI_MODEL`，否则功能将无法使用**

### AI 配置说明

AI 分析功能使用 LiteLLM 库，支持多种 AI 模型。**必须配置才能使用 AI 功能**：

1. **获取 API Key**：
   - OpenAI: 从 [OpenAI Platform](https://platform.openai.com/api-keys) 获取
   - Anthropic Claude: 从 [Anthropic Console](https://console.anthropic.com/) 获取
   - 其他支持的模型：查看 [LiteLLM 文档](https://docs.litellm.ai/)

2. **设置模型名称**（使用 `provider/model` 格式）：
   - OpenAI 视觉模型（推荐）: `openai/gpt-4o`, `openai/gpt-4-turbo`, `openai/gpt-4-vision-preview`
   - Anthropic Claude（推荐）: `anthropic/claude-3-opus-20240229`, `anthropic/claude-3-sonnet-20240229`, `anthropic/claude-3-5-sonnet-20241022`
   - Google Gemini（推荐）: `google/gemini-1.5-flash`, `google/gemini-1.5-pro`, `google/gemini-pro-vision`
   - 其他模型：查看 [LiteLLM 支持的模型列表](https://docs.litellm.ai/docs/providers)

3. **在 `.env` 文件中配置**：
   ```bash
   AI_API_KEY=your-api-key-here
   AI_MODEL=provider/model-name
   AI_BASE_URL=your-base-url-here  # 可选，如果不填则使用 litellm 默认的 baseUrl
   ```

   示例：
   ```bash
   # OpenAI 模型（使用 openai/ 前缀）
   AI_API_KEY=sk-your-openai-api-key
   AI_MODEL=openai/gpt-4o
   # AI_BASE_URL=https://api.openai.com/v1  # 可选，默认就是这个
   
   # Google Gemini 模型（使用 google/ 前缀）
   AI_API_KEY=your-google-api-key
   AI_MODEL=google/gemini-1.5-flash
   
   # Anthropic Claude 模型（使用 anthropic/ 前缀）
   AI_API_KEY=sk-ant-your-anthropic-api-key
   AI_MODEL=anthropic/claude-3-5-sonnet-20241022
   
   # 使用自定义代理或本地服务
   AI_API_KEY=your-api-key
   AI_MODEL=openai/gpt-4o
   AI_BASE_URL=https://your-proxy-server.com/v1  # 自定义 baseUrl
   ```

**注意**: 
- **AI 配置是必需的**，如果不配置或配置错误，AI 分析功能将无法使用，系统会返回明确的错误提示
- **统一使用 `provider/model` 格式**，例如 `openai/gpt-4o`、`anthropic/claude-3-5-sonnet-20241022`、`google/gemini-1.5-flash`
- 统一使用 `AI_API_KEY` 环境变量，不再区分不同的 API Key
- `AI_BASE_URL` 是**可选的**，如果不配置则使用 litellm 默认的 baseUrl。如果需要使用代理服务器或自定义 API 端点，可以配置此选项
- 推荐使用视觉模型（如 `openai/gpt-4o`, `anthropic/claude-3-5-sonnet-20241022`, `google/gemini-1.5-flash`），可以分析图片内容生成标签
- 非视觉模型只能基于文本提示生成标签，效果较差

### 4. 生成 Prisma Client

```bash
npx prisma generate
```

### 5. 运行数据库迁移

```bash
# 设置环境变量（Windows PowerShell）
$env:DATABASE_URL="mysql://root:你的密码@localhost:3306/image_management"
npx prisma migrate dev --name init

# 或者在 Linux/Mac
DATABASE_URL="mysql://root:你的密码@localhost:3306/image_management" npx prisma migrate dev --name init
```

### 6. 测试数据库连接（可选）

```bash
node scripts/test-connection.js
```

如果看到 `✅ 数据库连接成功！`，说明配置正确。

### 7. 启动服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动。

## 常见问题

### 1. 数据库连接失败

**错误**: `Authentication failed against database server`

**解决方案**:
- 检查 MySQL 服务是否启动
- 检查 `.env` 文件中的用户名和密码是否正确
- 尝试用命令行登录 MySQL 验证密码：`mysql -u root -p`

### 2. 数据库不存在

**错误**: `Unknown database 'image_management'`

**解决方案**:
- 运行 `CREATE DATABASE image_management;` 创建数据库
- 或运行 `mysql -u root -p < scripts/setup-db.sql`

### 3. Prisma 无法找到环境变量

**错误**: `Environment variable not found: DATABASE_URL`

**解决方案**:
- 确保 `.env` 文件存在于 `backend/` 目录
- 尝试在命令行中直接设置环境变量：
  ```bash
  # Windows PowerShell
  $env:DATABASE_URL="mysql://root:password@localhost:3306/image_management"
  
  # Linux/Mac
  export DATABASE_URL="mysql://root:password@localhost:3306/image_management"
  ```

### 4. 端口被占用

**错误**: `EADDRINUSE: address already in use :::3000`

**解决方案**:
- 修改 `.env` 文件中的 `PORT` 值
- 或关闭占用 3000 端口的程序

## 开发工具

### Prisma Studio

Prisma Studio 是一个可视化数据库管理工具：

```bash
npm run prisma:studio
```

会在浏览器中打开 `http://localhost:5555`，可以查看和编辑数据库数据。

### 查看日志

开发模式下，日志会直接输出到控制台。

## 下一步

配置完成后，可以：

1. 查看 [README.md](./README.md) 了解 API 文档
2. 查看 [后端.md](./后端.md) 了解架构设计
3. 使用 Postman 或其他工具测试 API

## 测试 API

### 1. 注册用户

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"password\":\"123456\",\"email\":\"test@example.com\"}"
```

### 2. 登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"password\":\"123456\"}"
```

会返回一个 token，用于后续认证。

### 3. 健康检查

```bash
curl http://localhost:3000/health
```

应该返回：`{"status":"ok","message":"Server is running"}`

