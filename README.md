# 企业管理系统 (EMS)

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Vue](https://img.shields.io/badge/vue-3.x-brightgreen)

企业管理系统（EMS）是一个基于 Vue 3 + Element Plus + Node.js + Express + MySQL 的全栈企业级后台管理系统，提供完整的用户、角色、部门、权限管理功能。

## 📋 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [API 文档](#api-文档)
- [测试](#测试)
- [开发指南](#开发指南)
- [部署](#部署)
- [贡献](#贡献)
- [许可证](#许可证)

## 🎯 功能特性

### 已实现功能

- ✅ **用户管理**：CRUD + 软删除 + 恢复 + 批量操作（启用/禁用/删除）
- ✅ **角色管理**：CRUD + 软删除 + 恢复 + 权限配置
- ✅ **部门管理**：CRUD + 软删除 + 恢复 + 回收站视图
- ✅ **权限系统**：中间件 + 菜单权限控制 + 角色权限页面禁用控制
- ✅ **认证系统**：JWT + bcrypt 密码加密
- ✅ **仪表盘**：统计数据展示
- ✅ **操作日志**：operation_logs + 审计日志查询
- ✅ **Excel 导入导出**：用户/部门/角色数据导入导出
- ✅ **分页**：横向页码
- ✅ **部门筛选**：树形下拉，fixed 定位
- ✅ **树形选择**：部门/角色树形选择（新建/编辑用户弹窗）
- ✅ **密码校验**：8位，大小写字母，数字，特殊字符

### 待完成功能（按优先级）

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P0 | 数据导出/导入 | ✅ 后端已完成，前端文件就位待测试（分支 feat/import-export） |
| P0 | 系统配置 | 可配置参数（密码有效期、登录锁定次数、分页大小等），写入数据库 |
| P0 | 个人设置 | 修改密码、个人信息 |
| P1 | 审计日志增强 | 登录/登出记录；敏感操作单独标注；日志导出/筛选 |
| P1 | 批量操作扩展 | 部门/角色批量启用/禁用 |
| P2 | 角色数据权限 | 只能看本部门/本部门及下级数据 |
| P2 | 通知/消息模块 | 站内通知、系统公告 |
| P3 | 其他优化 | 国际化支持、主题切换、帮助文档等 |

## 🛠 技术栈

### 前端

- **框架**：Vue 3.4+ (Composition API)
- **UI 组件库**：Element Plus 2.9+
- **构建工具**：Vite 6.0+
- **状态管理**：Pinia 2.3+
- **路由**：Vue Router 4.5+
- **HTTP 客户端**：Axios
- **测试**：Vitest + Vue Test Utils + Playwright (E2E)

### 后端

- **运行时**：Node.js 22.21+
- **框架**：Express 4.18+
- **数据库**：MySQL 8.0.46
- **数据库驱动**：mysql2/promise (连接池)
- **认证**：jsonwebtoken (JWT)
- **密码加密**：bcrypt
- **测试**：Jest + Supertest

### 开发工具

- **版本控制**：Git
- **代码规范**：ESLint + Prettier
- **内网穿透**：Cloudflare Tunnel (可选)

## 📁 项目结构

```
企业管理系统/
├── backend/                    # 后端代码
│   ├── app.js                  # 后端入口文件
│   ├── config/
│   │   └── db.js              # 数据库配置和初始化
│   ├── middleware/
│   │   ├── auth.js            # 认证中间件
│   │   ├── permission.js      # 权限中间件
│   │   └── operationLog.js    # 操作日志中间件
│   ├── routes/
│   │   ├── auth.js            # 认证路由
│   │   ├── users.js           # 用户管理路由
│   │   ├── roles.js           # 角色管理路由
│   │   ├── departments.js     # 部门管理路由
│   │   ├── dashboard.js       # 仪表盘路由
│   │   ├── operation_logs.js  # 操作日志路由
│   │   └── import_export.js   # 导入导出路由
│   ├── tests/                 # 后端测试
│   │   ├── auth.test.js
│   │   ├── users.test.js
│   │   ├── roles.test.js
│   │   ├── departments.test.js
│   │   └── dashboard.test.js
│   ├── package.json
│   └── jest.config.js
│
├── frontend_vue3/             # 前端代码（Vue 3 版本，当前使用）
│   ├── src/
│   │   ├── api/               # API 接口封装
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── roles.js
│   │   │   ├── departments.js
│   │   │   └── operationLogs.js
│   │   ├── assets/            # 静态资源
│   │   ├── components/        # 公共组件
│   │   ├── router/            # 路由配置
│   │   ├── store/             # Pinia 状态管理
│   │   │   ├── auth.js
│   │   │   └── user.js
│   │   ├── utils/             # 工具函数
│   │   │   └── request.js     # Axios 实例和拦截器
│   │   ├── views/             # 页面组件
│   │   │   ├── Login.vue
│   │   │   ├── Dashboard.vue
│   │   │   ├── UserManage.vue
│   │   │   ├── RoleManage.vue
│   │   │   ├── DeptManage.vue
│   │   │   └── OperationLog.vue
│   │   ├── App.vue
│   │   └── main.js
│   ├── e2e/                  # E2E 测试
│   │   └── user.spec.js
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── vitest.config.js
│
├── frontend/                  # 前端代码（原生版本，历史参考）
│   └── ...
│
└── README.md                 # 项目说明文档
```

## 🚀 快速开始

### 环境要求

- **Node.js**：>= 18.0.0
- **MySQL**：8.0+
- **npm**：>= 9.0.0 或 **yarn**：>= 1.22.0

### 1. 克隆项目

```bash
git clone <repository-url>
cd 企业管理系统
```

### 2. 配置数据库

登录 MySQL，创建数据库和用户：

```sql
CREATE DATABASE ems CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ems_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON ems.* TO 'ems_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. 后端配置

进入 `backend/` 目录，安装依赖：

```bash
cd backend
npm install
```

修改 `config/db.js` 中的数据库配置：

```javascript
const dbConfig = {
  host: 'localhost',
  user: 'ems_user',
  password: 'your_password',
  database: 'ems',
  port: 3306
};
```

启动后端服务：

```bash
node app.js
```

后端默认运行在 `http://localhost:3000`。

### 4. 前端配置

进入 `frontend_vue3/` 目录，安装依赖：

```bash
cd frontend_vue3
npm install
```

启动开发服务器：

```bash
npx vite --port 8080 --host
```

⚠️ **注意**：在 Windows 环境下，必须添加 `--host` 参数，否则可能仅监听 IPv6。

前端默认运行在 `http://localhost:8080`。

### 5. 访问系统

打开浏览器，访问 `http://localhost:8080`，使用以下默认账号登录：

- **用户名**：admin
- **密码**：admin123!

## ⚙️ 配置说明

### 后端配置

| 配置项 | 位置 | 说明 |
|--------|------|------|
| 数据库配置 | `backend/config/db.js` | MySQL 连接参数 |
| JWT 密钥 | `backend/app.js` | Token 签名密钥 |
| 端口 | `backend/app.js` | 后端服务端口（默认 3000） |

### 前端配置

| 配置项 | 位置 | 说明 |
|--------|------|------|
| API 地址 | `frontend_vue3/src/utils/common.js` | 后端 API 地址（第244行） |
| 端口 | `frontend_vue3/vite.config.js` | 前端开发服务器端口（默认 8080） |

### 内网穿透（可选）

如需外网访问，可使用 Cloudflare Tunnel：

```powershell
# 后端隧道
cloudflared tunnel --url http://localhost:3000

# 前端隧道
cloudflared tunnel --url http://localhost:8080
```

启用后需同步更新 `frontend_vue3/src/utils/common.js` 中的 `API_BASE`。

## 📚 API 文档

### 认证接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/auth/login` | 登录 | 公开 |
| GET | `/api/auth/me` | 获取当前用户信息 | 需要登录 |

### 用户管理接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/users` | 获取用户列表（分页、筛选） | user-view |
| POST | `/api/users` | 创建用户 | user-create |
| PUT | `/api/users/:id` | 更新用户 | user-edit |
| DELETE | `/api/users/:id` | 软删除用户 | user-delete |
| PUT | `/api/users/:id/restore` | 恢复用户 | user-restore |
| PUT | `/api/users/:id/reset-password` | 重置密码 | user-edit |
| POST | `/api/users/batch` | 批量操作（启用/禁用/删除） | user-edit / user-delete |

### 角色管理接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/roles` | 获取角色列表 | role-view |
| POST | `/api/roles` | 创建角色 | role-create |
| PUT | `/api/roles/:id` | 更新角色 | role-edit |
| DELETE | `/api/roles/:id` | 软删除角色 | role-delete |
| PUT | `/api/roles/:id/restore` | 恢复角色 | role-restore |
| PUT | `/api/roles/:id/permissions` | 更新角色权限 | role-edit |
| GET | `/api/roles/permissions/all` | 获取全部权限列表 | role-view |

### 部门管理接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/departments` | 获取部门列表（树形） | dept-view |
| POST | `/api/departments` | 创建部门 | dept-create |
| PUT | `/api/departments/:id` | 更新部门 | dept-edit |
| DELETE | `/api/departments/:id` | 软删除部门 | dept-delete |
| PUT | `/api/departments/:id/restore` | 恢复部门 | dept-restore |

### 仪表盘接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/dashboard/stats` | 获取统计数据 | dashboard-view |

### 操作日志接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/operation-logs` | 获取操作日志列表 | log-view |

### 导入导出接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/export/users` | 导出用户数据（Excel） | user-export |
| GET | `/api/export/roles` | 导出角色数据（Excel） | role-export |
| GET | `/api/export/departments` | 导出部门数据（Excel） | dept-export |
| POST | `/api/import/users` | 导入用户数据（Excel） | user-import |
| POST | `/api/import/roles` | 导入角色数据（Excel） | role-import |
| POST | `/api/import/departments` | 导入部门数据（Excel） | dept-import |

## 🧪 测试

### 后端测试（Jest）

```bash
cd backend
npm test
```

**测试覆盖**：
- ✅ 认证模块：6 项测试
- ✅ 用户管理：20 项测试
- ✅ 角色管理：8 项测试
- ✅ 部门管理：8 项测试
- ✅ 仪表盘：10 项测试
- **总计**：52 项测试全部通过

### 前端测试（Vitest）

```bash
cd frontend_vue3
npm test
```

**测试覆盖**：
- ✅ Store-User：7 项测试
- ✅ API-Auth：4 项测试
- ✅ API-Departments：4 项测试
- ✅ API-Users：8 项测试
- ✅ API-Roles：8 项测试
- **总计**：29 项测试全部通过

### E2E 测试（Playwright）

```bash
cd frontend_vue3
npm run test:e2e
```

**测试覆盖**：
- ✅ 用户管理完整流程：25 项测试
- **总计**：25 项测试全部通过

### 测试数据清理

- Jest `afterAll` 钩子按种子 ID 范围清理测试数据，保留 seed 数据
- 种子数据 ID 范围：
  - roles: 1-3
  - users: 1-5
  - departments: 1-8
  - permissions: 1-16

## 💻 开发指南

### 启动长驻服务（推荐方式）

⚠️ **规则**：修改前端代码后必须重启 Vite；启动长驻服务必须使用 `Start-Process`。

**后端**：

```powershell
Start-Process -FilePath "node" -ArgumentList "E:\AI_Project\企业管理系统\backend\app.js" -WorkingDirectory "E:\AI_Project\企业管理系统\backend"
```

**前端**：

```powershell
Start-Process -FilePath "npx" -ArgumentList "vite --port 8080 --host" -WorkingDirectory "E:\AI_Project\企业管理系统\frontend_vue3"
```

**验证**：

```powershell
Get-NetTCPConnection -LocalPort 3000,8080
```

### 数据库约定

- 所有 SELECT（列表/详情/COUNT）：加 `AND deleted_at IS NULL`
- DELETE：改为 `UPDATE SET deleted_at = NOW()`
- 恢复：`UPDATE SET deleted_at = NULL WHERE id = ?`
- MySQL 不接受 undefined 参数，nullable 字段必须显式传 null
- INSERT 后用 `result.insertId` 获取自增主键

### 代码规范

- **后端**：使用 `async/await` 处理异步操作
- **前端**：优先使用 Composition API
- **提交信息**：遵循 Conventional Commits 规范

### 分支管理

- `master`：生产分支
- `feat/*`：功能分支
- `fix/*`：修复分支

## 📦 部署

### 后端部署

1. 安装生产依赖：

```bash
cd backend
npm install --production
```

2. 使用 PM2 管理进程：

```bash
npm install -g pm2
pm2 start app.js --name ems-backend
pm2 save
pm2 startup
```

### 前端部署

1. 构建生产版本：

```bash
cd frontend_vue3
npm run build
```

2. 将 `dist/` 目录部署到 Web 服务器（Nginx / Apache）。

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend_vue3/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 提交 Issue

请包含以下信息：
- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 截图（如适用）

### 提交 Pull Request

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feat/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feat/amazing-feature`)
5. 提交 Pull Request

## 📄 许可证

MIT License

## 📞 联系方式

如有问题，请提交 Issue 或联系项目维护者。

---

**⚠️ 重要提示**：
- 后端入口文件是 `app.js` 不是 `server.js`
- 前端当前使用 `frontend_vue3/` 目录，原生前端 `frontend/` 保留作历史参考
- 项目使用软删除机制，`deleted_at` 字段用于标记删除状态
- 权限系统使用 `permissions` 表管理，通过 `role_permissions` 表关联角色

**🎉 版本历史**：
- **v1.0.0** (2026-05-07)：第一个稳定版本，所有核心功能完整，106 项测试全部通过
