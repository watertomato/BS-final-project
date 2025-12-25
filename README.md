# 图片管理系统（Image Management System）

这是一个用于上传、管理与检索图片的全栈示例应用，包含：用户注册/登录、图片上传（含 EXIF 提取）、缩略图生成、标签管理、AI 自动标注与对话式检索、以及图片编辑功能。后端使用 Node.js + Prisma（MySQL），前端使用 React + Vite + Ant Design，已提供 Docker Compose 配置供一键部署。

---

## 1. 使用 Docker（推荐）

先准备 `.env`：从示例复制并编辑

```bash
cp env.example .env
# 编辑 .env，确保 DATABASE_URL、JWT_SECRET 等被正确设置；若使用 AI 功能请配置 AI_API_KEY 和 AI_MODEL
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

