Docker Compose 部署说明（中文）

前提要求
- 已安装 Docker（建议 >= 20.10）
- 已安装 Docker Compose（使用 Docker CLI 插件或 compose v2）

快速开始

1) 在项目根目录创建或复制 `.env` 文件（推荐）：你可以从示例文件复制一份并修改：

  - 复制示例并编辑：

    `cp env.example .env`

  - 常用环境变量：
    - `DATABASE_URL`（Compose 中的默认示例为：`mysql://user:password@tcp(db:3306)/imagedb`）
    - `AI_API_KEY`、`AI_MODEL`、`AI_BASE_URL`（如果需要启用 AI 功能，请设置）
      - `AI_BASE_URL` 是可选项：如果留空或删除该环境变量，程序将使用 `litellm` 的默认 base URL（或根据所选模型自动处理）。如果不打算启用任何 AI 功能，可以将 `AI_API_KEY` 与 `AI_MODEL` 也留空或从 `.env` 删除。

2) 构建并启动服务栈：

  docker compose up --build

服务说明
- `db`：MySQL 8.0（映射端口 3306）
- `backend`：Node.js 后端（容器端口 3000，映射到宿主机 3000）
- `frontend`：Vite 构建后的前端由 nginx 提供（宿主机 3001 -> 容器 80）

注意事项
- 后端启动脚本会等待数据库可用，然后执行 `prisma migrate deploy`（如果存在迁移）并运行 `prisma generate`，最后启动服务。
- 上传的文件挂载到主机目录 `./backend/uploads`，确保重启或重建容器时数据不会丢失。
- 前端构建时可以通过 build-arg 覆盖 `VITE_API_BASE_URL`，在 Compose 文件中我们已将其指向内部服务地址 `http://backend:3000/api`，如果需要对外部后端或其他地址，请在构建时修改该值。
- 请根据生产环境需求修改 MySQL 密码、用户和数据库名，并为 AI 相关环境变量配置正确的值。

常见命令
- 构建并启动：`docker compose up --build`
- 后台运行：`docker compose up -d --build`
- 停止并移除：`docker compose down`
- 查看日志：`docker compose logs -f`

若需进一步定制（例如加入 SSL、调整 nginx 配置、添加更多健康检查或重启策略），我可以继续帮你完善。 


