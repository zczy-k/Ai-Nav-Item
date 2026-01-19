# 自定义搜索引擎功能

## 功能概述

用户可以通过输入搜索引擎的URL地址,系统自动解析网站信息(名称、图标、搜索URL模板),用户可编辑后保存为自定义搜索引擎,并持久化存储在数据库中。

## 功能特点

1. **URL自动解析**
   - 输入搜索引擎主页URL
   - 自动提取网站名称(从title标签)
   - 自动提取网站图标(favicon)
   - 智能检测搜索表单,生成搜索URL模板
   - 自动生成关键词(keyword)

2. **可编辑的解析结果**
   - 名称:搜索引擎显示名称
   - 图标URL:可自定义图标地址
   - 搜索URL模板:使用 `{searchTerms}` 作为占位符
   - 关键词:用于快捷搜索(可选)

3. **数据持久化**
   - 自定义搜索引擎存储在数据库中
   - 支持跨设备同步(通过数据库)
   - 不再依赖localStorage

4. **完整的CRUD操作**
   - 创建:通过URL解析添加新搜索引擎
   - 读取:启动时自动加载所有自定义搜索引擎
   - 更新:支持修改搜索引擎信息(TODO)
   - 删除:点击搜索引擎旁的删除按钮

## 使用方法

### 添加自定义搜索引擎

1. 点击搜索框左侧的搜索引擎选择器
2. 在下拉菜单顶部点击 "+" 按钮
3. 输入搜索引擎的URL(例如: `https://www.google.com`)
4. 点击"下一步",系统自动解析
5. 编辑解析后的信息(可选)
6. 点击"添加"完成

### 使用自定义搜索引擎

1. 点击搜索框左侧的搜索引擎选择器
2. 从下拉菜单中选择自定义的搜索引擎
3. 输入搜索关键词并回车或点击搜索按钮

### 删除自定义搜索引擎

1. 点击搜索框左侧的搜索引擎选择器
2. 在下拉菜单中找到要删除的搜索引擎
3. 点击右侧的 "×" 删除按钮
4. 确认删除

## 技术实现

### 数据库表结构

```sql
CREATE TABLE custom_search_engines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  search_url TEXT NOT NULL,
  icon_url TEXT,
  keyword TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

### API接口

#### 1. 解析搜索引擎URL
```
POST /api/search-engines/parse
需要认证: 是

请求体:
{
  "url": "https://www.google.com"
}

响应:
{
  "name": "Google",
  "searchUrl": "https://www.google.com/search?q={searchTerms}",
  "iconUrl": "https://www.google.com/favicon.ico",
  "keyword": "google"
}
```

#### 2. 获取所有搜索引擎
```
GET /api/search-engines
需要认证: 否

响应:
[
  {
    "id": 1,
    "name": "Google",
    "search_url": "https://www.google.com/search?q={searchTerms}",
    "icon_url": "https://www.google.com/favicon.ico",
    "keyword": "google",
    "order": 0,
    "created_at": "2025-11-03T04:00:00.000Z"
  }
]
```

#### 3. 添加搜索引擎
```
POST /api/search-engines
需要认证: 是

请求体:
{
  "name": "Google",
  "search_url": "https://www.google.com/search?q={searchTerms}",
  "icon_url": "https://www.google.com/favicon.ico",
  "keyword": "google"
}

响应:
{
  "id": 1,
  "name": "Google",
  "search_url": "https://www.google.com/search?q={searchTerms}",
  "icon_url": "https://www.google.com/favicon.ico",
  "keyword": "google",
  "order": 0
}
```

#### 4. 更新搜索引擎
```
PUT /api/search-engines/:id
需要认证: 是

请求体:
{
  "name": "Google Search",
  "search_url": "https://www.google.com/search?q={searchTerms}",
  "icon_url": "https://www.google.com/favicon.ico",
  "keyword": "g"
}
```

#### 5. 删除搜索引擎
```
DELETE /api/search-engines/:id
需要认证: 是

响应:
{
  "message": "删除成功"
}
```

#### 6. 批量更新排序
```
POST /api/search-engines/reorder
需要认证: 是

请求体:
{
  "engines": [
    { "id": 1 },
    { "id": 2 },
    { "id": 3 }
  ]
}
```

### 前端实现

#### 状态管理
```javascript
const engineStep = ref(1); // 1:输入URL 2:编辑信息
const engineUrl = ref('');
const engineLoading = ref(false);
const engineError = ref('');
const newEngine = ref({
  name: '',
  searchUrl: '',
  iconUrl: '',
  keyword: ''
});
```

#### 关键函数

1. `parseEngineUrl()` - 解析URL
2. `addCustomEngine()` - 添加搜索引擎
3. `deleteCustomEngine(engine)` - 删除搜索引擎
4. `selectEngineFromDropdown(engine)` - 选择搜索引擎

## 解析逻辑说明

### 网站名称提取
1. 优先从 `<title>` 标签获取
2. 如果失败,使用域名作为名称

### 图标提取
按优先级尝试以下选择器:
1. `link[rel="icon"]`
2. `link[rel="shortcut icon"]`
3. `link[rel="apple-touch-icon"]`
4. `link[rel="apple-touch-icon-precomposed"]`
5. 如果都没有,使用 `/favicon.ico`

### 搜索URL模板生成
1. 检测页面中的搜索表单
2. 查找搜索输入框(type="search"或name包含"search"或name="q")
3. 获取表单action和输入框name
4. 生成搜索URL: `action?inputName={searchTerms}`
5. 如果没检测到表单,使用默认模式: `baseUrl?q={searchTerms}`

### 关键词生成
- 将网站名称转为小写并移除空格
- 例如: "Google Search" → "googlesearch"

## 注意事项

1. **占位符统一**
   - 后端解析使用 `{searchTerms}`
   - 前端使用时替换为实际搜索词

2. **跨域问题**
   - 后端解析时设置User-Agent避免被拦截
   - 部分网站可能阻止爬虫,解析可能失败

3. **图标加载失败处理**
   - 使用 `@error` 事件隐藏加载失败的图标
   - 回退显示emoji图标

4. **认证要求**
   - 添加、删除、解析操作需要管理员权限
   - 查询操作无需认证

## 未来改进

1. [ ] 支持编辑已有搜索引擎
2. [ ] 支持拖拽排序
3. [ ] 支持导入/导出搜索引擎配置
4. [ ] 支持搜索建议(suggestions)
5. [ ] 支持快捷键搜索(输入关键词+空格自动选择引擎)
6. [ ] 支持更多搜索引擎模板预设
7. [ ] 优化解析算法,支持更多搜索引擎类型
