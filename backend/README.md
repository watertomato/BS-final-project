# 图片管理系统 - 后端

基于 Node.js + Express + Prisma + MySQL 的图片管理系统后端服务。

## 功能特性

- ✅ 用户注册/登录（JWT 认证）
- ✅ 图片上传（支持自动生成缩略图）
- ✅ EXIF 信息自动提取（拍摄时间、地点、设备等）
- ✅ 标签管理（用户自定义、EXIF、AI）
- ✅ 图片查询（支持多条件组合查询）
- ✅ 图片编辑和删除

## 技术栈

- **Node.js**: JavaScript 运行时
- **Express**: Web 框架
- **Prisma**: ORM 数据库工具
- **MySQL**: 关系型数据库
- **JWT**: 用户认证
- **Sharp**: 图片处理
- **ExifReader**: EXIF 信息提取
- **Multer**: 文件上传

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
# Database
DATABASE_URL="mysql://root:password@localhost:3306/image_management"

# JWT
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000

# AI (可选)
# 指定供应商: gemini | qwen，不配置则使用本地规则
AI_PROVIDER=gemini
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_VISION_MODEL="gemini-1.5-flash"
GEMINI_TEXT_MODEL="gemini-1.5-flash"

QWEN_API_KEY="your-qwen-api-key"
QWEN_MODEL="qwen-vl-plus"
QWEN_TEXT_ENDPOINT="https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
QWEN_API_ENDPOINT="https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate
```

### 4. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3000` 启动。

## API 文档

### 认证相关 (`/api/auth`)

#### 用户注册
```
POST /api/auth/register
Body: {
  "username": "testuser",
  "password": "123456",
  "email": "test@example.com"
}
```

#### 用户登录
```
POST /api/auth/login
Body: {
  "username": "testuser",
  "password": "123456"
}
Response: {
  "token": "eyJhbGc..."
}
```

#### 获取当前用户
```
GET /api/auth/me
Headers: {
  "Authorization": "Bearer <token>"
}
```

### 图片管理 (`/api/images`)

#### 上传图片
```
POST /api/images/upload
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "multipart/form-data"
}
Body: FormData {
  "image": <file>
}
```

#### 获取图片列表
```
GET /api/images?page=1&limit=20&keyword=xxx&tags=风景,人物
Headers: {
  "Authorization": "Bearer <token>"
}
Query Parameters:
  - page: 页码（默认1）
  - limit: 每页数量（默认20）
  - keyword: 文件名关键词
  - startDate: 开始时间
  - endDate: 结束时间
  - tags: 标签（逗号分隔）
  - location: 拍摄地点
```

#### 对话式检索图片（AI 意图解析）
```
POST /api/images/search/dialog
Headers: {
  "Authorization": "Bearer <token>"
}
Body: {
  "query": "去年在重庆的夜景照片",
  "page": 1,
  "limit": 20
}
Response: {
  "success": true,
  "data": [ ... 图片列表 ... ],
  "filters": {
    "rawQuery": "去年在重庆的夜景照片",
    "interpreted": {
      "keyword": "去年在重庆的夜景照片",
      "tags": ["夜景","城市"],
      "location": "重庆",
      "dateRange": {
        "start": "2023-01-01T00:00:00.000Z",
        "end": "2023-12-31T23:59:59.000Z"
      }
    }
  }
}
```

#### 获取图片详情
```
GET /api/images/:id
Headers: {
  "Authorization": "Bearer <token>"
}
```

#### 更新图片信息
```
PUT /api/images/:id
Headers: {
  "Authorization": "Bearer <token>"
}
Body: {
  "originalFilename": "新文件名.jpg"
}
```

#### 删除图片
```
DELETE /api/images/:id
Headers: {
  "Authorization": "Bearer <token>"
}
```

#### 添加图片标签
```
POST /api/images/:id/tags
Headers: {
  "Authorization": "Bearer <token>"
}
Body: {
  "tags": ["风景", "旅游", "海边"]
}
```

#### AI 自动生成图片标签
```
POST /api/images/:id/ai-tags
Headers: {
  "Authorization": "Bearer <token>"
}
Body: {
  "prompt": "请更关注度假和家庭相关标签",
  "maxTags": 6
}
Response: {
  "success": true,
  "data": { ...图片详情... },
  "meta": {
    "generatedTags": ["亲子","旅行","海边"],
    "newlyAttached": ["亲子"]
  }
}
```

#### 移除图片标签
```
DELETE /api/images/:id/tags/:tagId
Headers: {
  "Authorization": "Bearer <token>"
}
```

### 标签管理 (`/api/tags`)

#### 获取所有标签
```
GET /api/tags
Headers: {
  "Authorization": "Bearer <token>"
}
```

#### 按类型获取标签
```
GET /api/tags/type/:type
Headers: {
  "Authorization": "Bearer <token>"
}
Type: 1=用户自定义, 2=EXIF, 3=AI
```

## 项目结构

```
backend/
├── src/
│   ├── controllers/       # 控制器层
│   │   ├── authController.js
│   │   ├── imageController.js
│   │   └── tagController.js
│   ├── routes/           # 路由层
│   │   ├── auth.js
│   │   ├── images.js
│   │   └── tags.js
│   ├── middlewares/      # 中间件
│   │   ├── auth.js       # JWT 认证
│   │   ├── upload.js     # 文件上传
│   │   └── errorHandler.js
│   ├── services/         # 服务层
│   │   ├── imageService.js    # 图片处理
│   │   └── exifService.js     # EXIF 提取
│   ├── utils/           # 工具函数
│   │   ├── prisma.js
│   │   ├── jwt.js
│   │   └── password.js
│   └── index.js         # 入口文件
├── prisma/
│   └── schema.prisma    # 数据库模型
├── uploads/             # 上传文件目录
│   ├── originals/       # 原图
│   └── thumbnails/      # 缩略图
├── package.json
└── README.md
```

## 数据库表结构

### 用户表 (t_user)
- id: 用户ID
- username: 用户名（唯一）
- password: 加密密码
- email: 邮箱（唯一）

### 图片表 (t_image)
- id: 图片ID
- user_id: 所属用户
- original_filename: 原始文件名
- stored_path: 存储路径
- thumbnail_path: 缩略图路径
- file_size: 文件大小
- resolution: 分辨率
- shooting_time: 拍摄时间（EXIF）
- location: 拍摄地点（EXIF）
- device_info: 设备信息（EXIF）

### 标签表 (t_tag)
- id: 标签ID
- name: 标签名称（唯一）
- type: 类型（1:用户自定义, 2:EXIF, 3:AI）

### 图片标签关联表 (t_image_tag_relation)
- id: 关联ID
- image_id: 图片ID
- tag_id: 标签ID

## 开发说明

### 添加新功能

1. 在 `prisma/schema.prisma` 中定义数据模型
2. 运行 `npm run prisma:migrate` 同步数据库
3. 在 `controllers/` 中编写业务逻辑
4. 在 `routes/` 中定义路由
5. 在 `src/index.js` 中注册路由

### 常用命令

```bash
# 查看数据库
npm run prisma:studio

# 重新生成 Prisma Client
npm run prisma:generate

# 创建新的数据库迁移
npm run prisma:migrate
```

## 注意事项

- 确保 MySQL 服务已启动
- 首次运行需要创建数据库：`CREATE DATABASE image_management;`
- 上传的图片会保存在 `uploads/` 目录
- JWT Token 默认有效期为 7 天
- 最大上传文件大小默认为 10MB

