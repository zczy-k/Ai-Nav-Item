# API 文档

Con-Nav-Item 提供完整的 REST API，支持所有核心功能的编程访问。

## 🔐 认证

所有管理 API 都需要 JWT 认证。

### 登录获取 Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

**响应:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin"
  }
}
```

### 使用 Token

在请求头中添加：
```http
Authorization: Bearer your-jwt-token
```

## 📋 菜单管理

### 获取所有菜单

```http
GET /api/menus
```

**响应:**
```json
{
  "success": true,
  "menus": [
    {
      "id": 1,
      "name": "常用工具",
      "order": 1,
      "subMenus": [
        {
          "id": 1,
          "name": "开发工具",
          "parent_id": 1,
          "order": 1
        }
      ]
    }
  ]
}
```

### 创建主菜单

```http
POST /api/menus
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "新菜单",
  "order": 2
}
```

### 创建子菜单

```http
POST /api/menus/sub
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "子菜单",
  "parent_id": 1,
  "order": 1
}
```

### 更新菜单

```http
PUT /api/menus/:id
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "更新后的菜单名"
}
```

### 删除菜单

```http
DELETE /api/menus/:id
Authorization: Bearer your-jwt-token
```

## 🎴 卡片管理

### 获取所有卡片

```http
GET /api/cards
```

**响应:**
```json
{
  "success": true,
  "cards": [
    {
      "id": 1,
      "title": "GitHub",
      "url": "https://github.com",
      "description": "代码托管平台",
      "menu_id": 1,
      "sub_menu_id": 1,
      "order": 1,
      "tags": [
        {
          "id": 1,
          "name": "开发",
          "color": "#007bff"
        }
      ]
    }
  ],
  "cardsByCategory": {
    "1": {
      "1": [/* 卡片数组 */]
    }
  }
}
```

### 创建卡片

```http
POST /api/cards
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "title": "新网站",
  "url": "https://example.com",
  "description": "网站描述",
  "menu_id": 1,
  "sub_menu_id": 1,
  "tags": [1, 2]
}
```

### 更新卡片

```http
PUT /api/cards/:id
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "title": "更新后的标题",
  "description": "更新后的描述"
}
```

### 删除卡片

```http
DELETE /api/cards/:id
Authorization: Bearer your-jwt-token
```

### 批量操作

```http
POST /api/cards/batch
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "action": "delete",
  "cardIds": [1, 2, 3]
}
```

## 🏷️ 标签管理

### 获取所有标签

```http
GET /api/tags
```

### 创建标签

```http
POST /api/tags
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "新标签",
  "color": "#28a745"
}
```

### 更新标签

```http
PUT /api/tags/:id
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "更新后的标签",
  "color": "#dc3545"
}
```

### 删除标签

```http
DELETE /api/tags/:id
Authorization: Bearer your-jwt-token
```

## 🤖 AI 功能

### 获取 AI 配置

```http
GET /api/ai/config
Authorization: Bearer your-jwt-token
```

### 更新 AI 配置

```http
POST /api/ai/config
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "provider": "deepseek",
  "apiKey": "your-api-key",
  "model": "deepseek-chat",
  "baseUrl": "https://api.deepseek.com"
}
```

### 测试 AI 连接

```http
POST /api/ai/test
Authorization: Bearer your-jwt-token
```

### 批量生成

```http
POST /api/ai/batch-generate
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "cardIds": [1, 2, 3],
  "types": ["name", "description", "tags"],
  "strategy": {
    "mode": "fill",
    "style": "default"
  }
}
```

## 💾 备份管理

### 获取备份列表

```http
GET /api/backup/list
Authorization: Bearer your-jwt-token
```

### 创建备份

```http
POST /api/backup/create
Authorization: Bearer your-jwt-token
```

### 恢复备份

```http
POST /api/backup/restore
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "filename": "backup-2024-01-19.zip"
}
```

### WebDAV 配置

```http
POST /api/backup/webdav/config
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "url": "https://dav.jianguoyun.com/dav/",
  "username": "your-username",
  "password": "your-password",
  "remotePath": "/Con-Nav-Item-Backups/"
}
```

## 🔍 搜索引擎

### 获取搜索引擎列表

```http
GET /api/search-engines
```

### 添加搜索引擎

```http
POST /api/search-engines
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "自定义搜索",
  "url": "https://example.com/search?q={query}",
  "icon": "https://example.com/favicon.ico"
}
```

## 🔖 书签同步

### 上传书签

```http
POST /api/bookmark-sync/upload
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "bookmarks": [
    {
      "title": "GitHub",
      "url": "https://github.com",
      "folder": "开发工具"
    }
  ]
}
```

### 获取书签

```http
GET /api/bookmark-sync/download
Authorization: Bearer your-jwt-token
```

## 📊 统计信息

### 获取系统统计

```http
GET /api/stats
Authorization: Bearer your-jwt-token
```

**响应:**
```json
{
  "success": true,
  "stats": {
    "totalCards": 150,
    "totalMenus": 8,
    "totalTags": 25,
    "totalBackups": 10,
    "lastBackup": "2024-01-19T10:30:00Z"
  }
}
```

## 🚨 错误处理

所有 API 都遵循统一的错误响应格式：

```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

**常见错误码:**
- `UNAUTHORIZED` - 未授权访问
- `INVALID_TOKEN` - Token 无效或过期
- `VALIDATION_ERROR` - 输入验证失败
- `NOT_FOUND` - 资源不存在
- `DUPLICATE_ENTRY` - 重复条目
- `SERVER_ERROR` - 服务器内部错误

## 📝 请求限制

- **认证 API**: 5 次/分钟
- **管理 API**: 100 次/分钟
- **公开 API**: 200 次/分钟
- **文件上传**: 10MB 最大大小

## 🔧 开发工具

### 使用 curl 测试

```bash
# 登录获取 token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}' | \
  jq -r '.token')

# 使用 token 访问 API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/cards
```

### 使用 Postman

1. 导入 API 集合（如果提供）
2. 设置环境变量 `baseUrl` 和 `token`
3. 在认证标签中选择 "Bearer Token"

## 📚 SDK 和客户端库

目前提供原生 REST API，欢迎社区贡献各语言的 SDK：

- JavaScript/TypeScript SDK（计划中）
- Python SDK（计划中）
- Go SDK（计划中）

## 🔄 版本控制

API 版本通过 URL 路径控制：
- 当前版本: `/api/` (v1)
- 未来版本: `/api/v2/`

向后兼容性将在主要版本更新时保持。