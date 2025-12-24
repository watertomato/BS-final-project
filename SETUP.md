# 本地运行（不使用 Docker）指南

下面说明如何在本地不使用 Docker 的情况下运行本项目（前端 + 后端 + 数据库）。包含依赖安装、数据库初始化、迁移、以及启动命令。文档假设你使用的是类 Unix 环境（Linux / macOS / WSL2）。

---

## 前置要求
- Node.js >= 20（推荐 20.x 或 22.x）和 npm（或 pnpm/yarn）。前端使用 Vite 要求新版 Node。  
- MySQL 8.x（或可选使用 SQLite，见「可选：使用 SQLite 开发环境」段落）。  
- Git

如果使用 macOS，可以用 Homebrew 安装：

```bash
# Node (示例)
brew install node@20

# MySQL
brew install mysql
```

在 Ubuntu / WSL：

```bash
# Node（推荐使用 nvm）
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash
# 重新打开 shell 后：
nvm install 20
nvm use 20

# MySQL（示例）
sudo apt update
sudo apt install mysql-server
```

---

## 克隆代码

```bash
git clone https://github.com/watertomato/BS-final-project.git project
cd project
```

---

## 后端（backend）设置与运行

1. 进入后端目录并安装依赖：

```bash
cd backend
npm install
```

2. 创建后端环境变量文件 `backend/.env`（示例）：

```bash
# backend/.env
PORT=3000
DATABASE_URL="mysql://user:password@127.0.0.1:3306/imagedb"
JWT_SECRET="change_this_secret"
JWT_EXPIRES_IN="7d"
AI_API_KEY=""         # 可选：用于 AI 功能
AI_MODEL=""           # 可选：例如 "google/gemini-2.5-flash"
AI_BASE_URL=""        # 可选：API base url（如使用私有化或代理）
MAX_FILE_SIZE=20971520 # 最大文件大小（字节），20MB 示例
```

调整 `DATABASE_URL` 为你本地 MySQL 的连接字符串。如果你按示例创建数据库/用户，使用上面的 `user`/`password`。

3. 初始化 MySQL（在 MySQL shell 或使用命令行）：

```sql
-- 在 mysql 客户端中执行（以 root 或有权限用户登录）
CREATE DATABASE imagedb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON imagedb.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
```

（如果你使用 127.0.0.1 / WSL，请确保用户 host 与 DATABASE_URL 中 host 一致。）

4. 运行 Prisma 迁移并生成客户端：

```bash
# 在 backend 目录
npx prisma migrate deploy    # 仓库包含 migrations
# 或（开发时可用）：
npx prisma migrate dev --name init

npx prisma generate
```

5. 创建上传目录（后端会写入 `uploads/originals` 和 `uploads/thumbnails`）：

```bash
mkdir -p uploads/originals uploads/thumbnails
chmod -R 755 uploads
```

6. 启动后端（开发模式）：

```bash
npm run dev
```

或生产模式：

```bash
npm run start
```

后端默认监听 `http://localhost:3000`（受 `PORT` 环境变量控制）。

可选：打开 Prisma Studio 查看数据：

```bash
npm run prisma:studio
```

---

## 前端（frontend）设置与运行

1. 进入前端目录并安装依赖：

```bash
cd ../frontend
npm install
```

2. 创建前端环境变量（可选）：

如果需要覆盖 API 地址（默认前端会请求 `http://localhost:3000/api`），可以在根或 `frontend/.env` 中添加：

```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:3000/api
```

3. 启动前端开发服务器：

```bash
npm run dev
```

默认会在 `http://localhost:5173` 启动。前端与后端联调时，确认 `VITE_API_BASE_URL` 指向后端（例如 `http://localhost:3000/api`）。

要构建生产包并用静态服务器预览：

```bash
npm run build
npm run preview
```

---

## 可选：AI 功能（如果你要使用 LLM/视觉模型）

- 在 `backend/.env` 中设置 `AI_API_KEY`、`AI_MODEL`（例如 `google/gemini-2.5-flash`）和可选 `AI_BASE_URL`（如果使用私有化或代理）。  
- 如果未配置，AI 接口会返回错误并且前端会显示相应提示；核心的上传/标签/搜索功能不依赖 AI（EXIF 标签仍然会正常工作）。

示例：

```bash
AI_API_KEY="sk-xxxx"
AI_MODEL="google/gemini-2.5-flash"
AI_BASE_URL=""
```


