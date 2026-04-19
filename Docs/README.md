# Docs / 文档中心

> 本目录存放项目开发过程中积累的规范文档和工作日志，供团队成员阅读学习。

---

## 📚 文档索引

| 文件 | 说明 |
|------|------|
| `README.md` | 📖 文档入口（本文） |
| `UI-DESIGN-SPEC.md` | 🎨 UI 设计规范 — CSS 变量、页面结构、表格/弹窗/筛选区组件、JS 规范 |
| `WORK-LOG-2026-04-19.md` | 📋 工作日志 — 今日工作过程的方法性问题及解决方案记录 |

---

## 🔑 新人阅读顺序

1. **先读 `UI-DESIGN-SPEC.md`** — 了解项目的 CSS 设计体系、组件规范、目录结构，新模块开发必须遵循此规范。
2. **再看 `WORK-LOG-2026-04-19.md`** — 了解今天踩过的所有坑（后端改代码未重启、BOM 编码、truthy 字符串陷阱、API 静默失败等），避免重蹈覆辙。

---

## 📁 项目结构（参考）

```
企业管理系统/
├── Docs/                    ← 文档中心（本文档所在目录）
├── backend/
│   ├── app.js               ← Express 主入口
│   ├── db.js                ← sql.js 数据库封装（run/all/get）
│   ├── db.json              ← SQLite 数据库文件
│   └── routes/
│       ├── users.js         ← 用户 CRUD + 软删除/恢复
│       ├── departments.js   ← 部门列表
│       └── roles.js         ← 角色 + 权限
├── frontend/
│   ├── common.css           ← 全局样式 + CSS 变量（所有页面共享）
│   ├── common.js            ← 通用组件（AuthManager / ModalManager / TableBatch）
│   ├── login.html
│   ├── index.html            ← 首页
│   ├── user-management.html ← 用户管理
│   ├── department.html      ← 部门架构
│   └── role-permission.html  ← 角色权限
└── Docs/
    ├── README.md             ← 文档入口
    ├── UI-DESIGN-SPEC.md     ← UI 设计规范
    └── WORK-LOG-2026-04-19.md  ← 工作日志
```

---

## 🔗 常用链接

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:8080 |
| 后端 API | http://localhost:3000 |
| 登录入口 | http://localhost:8080/login.html |
| 测试账号 | `admin / admin123` |

---

*最后更新：2026-04-19*
