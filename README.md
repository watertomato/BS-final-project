# 图片管理系统（Image Management System）

这是一个用于上传、管理与检索图片的全栈示例应用，包含：用户注册/登录、图片上传（含 EXIF 提取）、缩略图生成、标签管理、AI 自动标注与对话式检索、以及图片编辑功能。后端使用 Node.js + Prisma（MySQL），前端使用 React + Vite + Ant Design，已提供 Docker Compose 配置供一键部署。

---

## 1. 使用 Docker（推荐）

先准备 `.env`：从示例复制并编辑

```bash
cp env.example .env
# 编辑 .env，若使用 AI 功能请配置 AI_API_KEY 和 AI_MODEL，其他参数如不知道什么意思请不要修改
```

构建并启动服务：

```bash
docker compose up -d --build
```

服务端口（本仓库配置）：
- 前端（Nginx）: http://localhost:5173  -> 容器内 80  
- 后端 (Node) : http://localhost:3000  -> 容器内 3000  
- 数据库 (MySQL): 3306

检查日志：

```bash
docker compose logs -f
```

容器启动后，后端会等待数据库并自动运行 Prisma 迁移（仓库内包含初始迁移 SQL），因此不需要手动在 MySQL 中建表。上传文件会保存在 `backend/uploads`（在 Compose 配置中已挂载到宿主机）。

---

## 2. 不使用 Docker（本地开发 / 调试）

先决条件：
- Node.js >= 20（推荐 20.x / 22.x）  
- MySQL 8.x（或可选使用 SQLite，见下文）  
- Git

步骤：

下面是完整、逐步的本地运行说明（不使用 Docker）。请按顺序执行。

1) 克隆仓库

```bash
git clone https://github.com/watertomato/BS-final-project.git project
cd project
```

2) 安装并配置本地依赖环境

- 安装 Node.js（推荐使用 nvm 来管理版本）：

```bash
# 安装 nvm（若尚未安装）
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash
# 重新打开 shell，然后安装 Node.js 20
nvm install 20
nvm use 20
```

- 安装 MySQL（Ubuntu/WSL 示例）：

```bash
sudo apt update
sudo apt install mysql-server
sudo service mysql start
```

3) 后端设置与初始化

- 进入后端并安装依赖：

```bash
cd backend
npm install
```

- 创建并编辑后端环境文件 `backend/.env`（可参考 `env.example`）：

示例 `backend/.env`:

```text
PORT=3000
DATABASE_URL="mysql://user:password@127.0.0.1:3306/imagedb"
JWT_SECRET="change_this_secret"
JWT_EXPIRES_IN="7d"
AI_API_KEY=""
AI_MODEL=""
AI_BASE_URL=""
MAX_FILE_SIZE=20971520
```

- 在 MySQL 中创建数据库与用户（示例）：

```sql
-- 登录 mysql，然后执行：
CREATE DATABASE imagedb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON imagedb.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
```

注意：`DATABASE_URL` 中的用户名/密码必须与上述 MySQL 用户一致；否则后端无法连接。

- 运行 Prisma 迁移并生成客户端：

```bash
# 使用仓库内现有迁移（推荐用于部署/重放迁移）
npx prisma migrate deploy

# 或在开发环境使用 interactive migrate（会根据 schema 生成/提示迁移）
npx prisma migrate dev --name init

npx prisma generate
```

- 创建上传目录并确保可写：

```bash
mkdir -p uploads/originals uploads/thumbnails
chmod -R 755 uploads
```

- 启动后端（开发模式）：

```bash
npm run dev
```

或生产模式：

```bash
npm run start
```

4) 前端设置与运行

- 在另一个终端窗口：

```bash
cd ../frontend
npm install
```

- （可选）设置前端 API 地址（若后端不在默认位置）：

在 `frontend/.env` 中添加：

```text
VITE_API_BASE_URL=http://localhost:3000/api
```

- 启动前端开发服务器：

```bash
npm run dev
```

前端默认会在 `http://localhost:5173` 启动，访问并登录测试上传/检索功能。

---

## 3. MCP 接口（大模型对话式图片检索）

本项目提供 MCP (Model Context Protocol) 接口，允许大语言模型（如 Claude）通过自然语言对话方式检索图片库中的图片。

### 3.1 功能特性

- **自然语言搜索**：支持通过自然语言描述搜索图片（如"昨天拍的狗狗照片"、"风景图片"等）
- **标签筛选**：可指定标签进行精确筛选
- **地点搜索**：支持按拍摄地点搜索
- **图片详情查询**：获取单张图片的详细信息
- **标签管理**：列出所有可用标签

### 3.2 MCP 工具列表

#### `search_images`
通过自然语言描述搜索图片
- **参数**：
  - `query` (必需): 搜索描述
  - `limit` (可选): 最大返回数量，默认20
  - `tags` (可选): 指定标签数组
  - `location` (可选): 指定地点

#### `get_image_details`
获取指定图片的详细信息
- **参数**：
  - `image_id` (必需): 图片ID

#### `list_user_tags`
列出用户的所有标签
- **参数**：
  - `limit` (可选): 最大返回数量，默认50

### 3.3 在 Claude Desktop 中使用

1. **安装 Claude Desktop**（如果尚未安装）

2. **配置 MCP 服务器**：
   - 复制 `claude_desktop_config.json` 到 Claude Desktop 配置目录
   - 根据你的系统修改路径：
     - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
     - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

3. **修改配置文件中的路径**：
   ```json
   {
     "mcpServers": {
       "image-search": {
         "command": "node",
         "args": ["/absolute/path/to/your/project/backend/src/mcp/index.js"],
         "env": {
           "MCP_DEFAULT_USER_ID": "1",
           "DATABASE_URL": "mysql://user:password@localhost:3306/imagedb"
         }
       }
     }
   }
   ```

4. **重启 Claude Desktop**

5. **开始对话式搜索**：
   现在你可以在 Claude 中这样对话：
   - "帮我找找昨天拍的照片"
   - "搜索包含狗狗的图片"
   - "查看图片ID为123的详细信息"
   - "列出我所有的标签"

### 3.4 快速开始

#### 1. 安装依赖

```bash
cd backend
npm install
```

#### 2. 配置环境变量

创建 `.env` 文件或设置环境变量：

```bash
export MCP_DEFAULT_USER_ID="1"  # 用户ID
export DATABASE_URL="mysql://user:password@localhost:3306/imagedb"
```

#### 3. 启动 MCP 服务器

**方式1：直接运行**
```bash
# 确保数据库正在运行
docker compose up db -d

# 安装依赖（如果还没有）
cd backend && npm install

# 启动MCP服务器c
npm run mcp
```

**方式2：Docker Compose服务模式**
```bash
# 编辑 docker-compose.yml，取消注释 mcp 服务配置
# 然后运行
docker compose up mcp
```

注意：MCP服务器使用stdio通信，不需要端口映射，直接在容器内部运行。

### 3.5 在 Claude Desktop 中使用

1. **安装 Claude Desktop**（如果尚未安装）

2. **配置 MCP 服务器**：
   - 复制 `claude_desktop_config.json` 到 Claude Desktop 配置目录
   - 根据你的系统修改路径：
     - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
     - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

3. **修改配置文件中的路径**：
   ```json
   {
     "mcpServers": {
       "image-search": {
         "command": "node",
         "args": ["/absolute/path/to/your/project/backend/src/mcp/index.js"],
         "env": {
           "MCP_DEFAULT_USER_ID": "1",
           "DATABASE_URL": "mysql://user:password@localhost:3306/imagedb"
         }
       }
     }
   }
   ```

4. **重启 Claude Desktop**

5. **开始对话式搜索**：
   现在你可以在 Claude 中这样对话：
   - "帮我找找昨天拍的照片"
   - "搜索包含狗狗的图片"
   - "查看图片ID为123的详细信息"
   - "列出我所有的标签"

### 3.6 命令行使用（测试）

如果你想在命令行中测试 MCP 服务器：

```bash
# 安装依赖（如果尚未安装）
cd backend
npm install

# 启动 MCP 服务器
npm run mcp
```

然后在另一个终端中使用 MCP 客户端测试（需要安装 MCP SDK）。

### 3.7 环境变量配置

MCP 服务器需要以下环境变量：

- `MCP_DEFAULT_USER_ID`: 默认用户ID（用于标识哪个用户的图片库）
- `DATABASE_URL`: 数据库连接字符串

确保数据库正在运行且包含图片数据。

### 3.8 使用示例

#### 基本搜索

```
用户: 帮我找几张风景照片

Claude: 我来帮你搜索风景照片...

(调用 search_images 工具)
```

#### 查看图片详情

```
用户: 查看图片ID 123的详细信息

Claude: 获取图片详细信息...

(调用 get_image_details 工具，image_id: "123")
```

#### 列出所有标签

```
用户: 我有哪些标签可以用？

Claude: 让我帮你列出所有标签...

(调用 list_user_tags 工具)
```