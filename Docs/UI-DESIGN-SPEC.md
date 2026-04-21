# 企业管理系统 UI 设计规范

> 基于现有模块（用户管理 / 部门架构 / 角色权限）的设计模式提炼，作为后续新模块的开发规范。

---

## 一、设计系统底层

### 1.1 CSS 变量体系（Design Tokens）

所有颜色、间距、圆角统一通过 CSS 变量声明，禁止硬编码颜色值。

**变量定义位置**：`frontend/common.css` 顶部 `:root`

```css
:root {
  /* 主色调 */
  --primary:       #3B82F6;   /* 蓝色主色 */
  --primary-dark:  #2563EB;
  --primary-light: rgba(59,130,246,.15);

  /* 背景层次 */
  --bg:      #0F172A;   /* 页面背景（深色） */
  --bg-elev: #1E293B;   /* 卡片/弹窗背景（提亮一层） */
  --bg-hover:#334155;   /* 悬停/选中态 */

  /* 文本层次 */
  --text:   #F1F5F9;   /* 正文 */
  --muted:  #94A3B8;   /* 次要文字、占位符 */

  /* 边框与阴影 */
  --border: #334155;
  --shadow: 0 4px 12px rgba(0,0,0,.3);

  /* 语义色 */
  --success: #4ADE80;
  --warning: #FBBF24;
  --danger:  #F87171;

  /* 圆角基准 */
  --radius: 12px;
}
```

**浅色主题**：`data-theme="light"` 下覆盖以上变量。

**禁止出现**：直接写 `#3B82F6`、`#fff`、`rgba(0,0,0,.5)` 等硬编码值，一律用 CSS 变量。

### 1.2 字号规范

| 用途 | 字号 | font-weight |
|------|------|-------------|
| 页面标题 | 22px | 600 |
| 弹窗标题 / 模块标题 | 16-18px | 600 |
| 正文 / 按钮文字 | 13-14px | 400-500 |
| 标签 / 次要说明 | 12px | 400-500 |

### 1.3 间距规范

| 场景 | 值 |
|------|-----|
| 组件内 padding | 12px ~ 20px |
| 卡片间距（纵向） | 20px ~ 24px |
| 卡片内元素间距 | 12px ~ 16px |
| 按钮内 padding | `10px 18px`（常规）/ `6px 12px`（`.btn-sm`） |

### 1.4 滚动条

全局滚动条已在 `common.css` 中统一声明，新模块**不重复定义**。

```css
/* 已全局定义（WebKit + Firefox） */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
* { scrollbar-width: thin; scrollbar-color: var(--border) var(--bg); }
```

---

## 二、页面结构规范

### 2.1 通用布局

```
┌─ header (position:fixed; height:60px) ───────────────────────────────────┐
│  logo | 全局搜索框 | 主题切换 | 用户头像                                   │
└───────────────────────────────────────────────────────────────────────────┘
┌─ sidebar (position:fixed; width:240px) ─┐ ┌─ main ──────────────────────┐
│  nav-section（分组标题 uppercase 12px）  │ │ page-header                 │
│  nav-item（hover:primary-light）         │ │  面包屑 + 页面标题 + 按钮   │
│  nav-item.active（primary 背景，白字）    │ │                             │
│                                          │ │ filter-bar（可选）           │
│                                          │ │ content-card（表格/内容）    │
│                                          │ │ pagination                   │
└──────────────────────────────────────────┘ └──────────────────────────────┘
```

### 2.2 页面头部（page-header）

**结构**：
```html
<div class="page-header">
  <div>
    <div class="breadcrumb">组织管理 / <span>用户管理</span></div>
    <div class="page-title">用户管理</div>
  </div>
  <button class="btn btn-primary" onclick="openModal('add')">+ 新增用户</button>
</div>
```

**原则**：
- 左侧：面包屑 + 页面标题
- 右侧：主要操作按钮（新增/导出）
- 多按钮时 `display:flex; gap:8px`

### 2.3 面包屑（breadcrumb）

- 格式：`一级 / <span>二级</span>`
- 末级文字高亮为 `--primary`
- 字号 13px，颜色 `--muted`

---

## 三、筛选区（filter-bar）

### 3.1 结构

```html
<div class="filter-bar">
  <div class="filter-row">
    <div class="filter-item">
      <label class="filter-label">关键词</label>
      <input class="filter-input" id="searchKeyword" placeholder="搜索姓名/账号..." />
    </div>
    <div class="filter-item">
      <label class="filter-label">部门</label>
      <div class="tree-select" id="filterDept">...</div>
    </div>
    <div class="filter-item">
      <label class="filter-label">角色</label>
      <select class="filter-select" id="filterRole">...</select>
    </div>
    <div class="filter-item">
      <label class="filter-label">状态</label>
      <select class="filter-select" id="filterStatus">...</select>
    </div>
    <button class="btn btn-sm btn-outline" onclick="handleReset()">重置</button>
    <button class="btn btn-sm btn-primary" onclick="handleSearch()">搜索</button>
  </div>
</div>
```

### 3.2 原则

- 包裹层：`.filter-bar`，背景 `var(--bg-elev)`，边框 `var(--border)`，`border-radius: var(--radius)`
- 内部：`display:flex; flex-wrap:wrap; align-items:center` + `.filter-item` 分组
- 筛选控件统一高度 36px（`.filter-input` / `.filter-select`）
- 重置按钮放最后，与搜索按钮配对

---

## 四、表格模块

### 4.1 结构

```html
<div class="content-card table-card">
  <!-- 批量操作栏（初始 display:none，由 TableBatch 控制） -->
  <div class="batch-bar" id="batchBar" style="display:none">
    <span class="batch-info">已选 <span id="selectedCount">0</span> 项</span>
    <div class="batch-actions">
      <button class="btn btn-sm btn-outline">批量启用</button>
      <button class="btn btn-sm btn-danger">批量删除</button>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr>
        <th><input type="checkbox" class="checkbox" id="selectAll" /></th>
        <th>用户</th><th>部门</th><th>角色</th><th>手机号</th>
        <th>状态</th><th>最后登录</th><th>操作</th>
      </tr></thead>
      <tbody id="userTableBody"></tbody>
    </table>
  </div>

  <div class="pagination">
    <div class="page-info">
      共 <span id="totalCount">0</span> 条
      <select class="page-size" id="pageSize" onchange="changePageSize()">
        <option value="20">20/页</option><option value="50">50/页</option>
      </select>
    </div>
    <div class="page-controls">
      <button class="page-btn" id="btnFirst" onclick="goToPage(1)">«</button>
      <button class="page-btn" id="btnPrev" onclick="prevPage()">‹</button>
      <span id="pageNumbers"></span>
      <button class="page-btn" id="btnNext" onclick="nextPage()">›</button>
      <button class="page-btn" id="btnLast" onclick="goToPage(totalPages)">»</button>
    </div>
  </div>
</div>
```

### 4.2 原则

- 外层：`.content-card` + `.table-card`（后者加 `overflow:hidden`）
- 使用 `<table>` 语义化标签，不用 div 模拟列
- 操作列固定最后一列，`display:flex; gap:8px`
- 批量操作栏初始 `display:none`，由 `TableBatch.updateBatchBar()` 控制
- 用户列：`div.user-cell` > `div.user-avatar` + `div.user-info`（姓名 + 账号）

### 4.3 分页器规范

- 容器：`.pagination`，`display:flex; justify-content:space-between; align-items:center`
- 总条数：`#totalCount`
- 页码区域：`#pageNumbers` + `.page-btn`
- 每页条数：`.page-size` select
- 省略号：`...` 文本节点，非按钮

---

## 五、视图切换（Tab / switchView）

### 5.1 结构

```html
<div class="filter-bar" style="display:flex;align-items:center;justify-content:space-between">
  <div class="view-tabs">
    <button class="view-tab active" data-view="active" onclick="switchView('active')">用户列表</button>
    <button class="view-tab" data-view="deleted" onclick="switchView('deleted')">回收站</button>
  </div>
  <button class="btn btn-primary" id="addUserBtn" onclick="openModal('add')">+ 新增用户</button>
</div>
```

### 5.2 switchView 函数规范

```javascript
function switchView(view) {
  if (currentView === view) return;
  currentView = view;
  currentPage = 1;  // 重置页码

  // ① Tab 样式切换
  document.querySelectorAll('.view-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === view);
  });

  // ② 面包屑动态更新（如有二级视图）
  // document.getElementById('breadcrumbTitle').textContent = ...

  // ③ 隐藏/显示新增按钮（回收站无新增）
  document.getElementById('addUserBtn').style.display = view === 'deleted' ? 'none' : '';

  // ④ 批量操作栏按钮切换
  const batchActions = document.querySelector('.batch-actions');
  if (view === 'deleted') {
    batchActions.innerHTML = `<button onclick="batchAction('restore')">批量恢复</button>`;
  } else {
    batchActions.innerHTML = `
      <button class="btn btn-sm btn-outline" onclick="batchAction('enable')">批量启用</button>
      <button class="btn btn-sm btn-outline" onclick="batchAction('disable')">批量禁用</button>
      <button class="btn btn-sm btn-danger" onclick="batchAction('delete')">批量删除</button>`;
  }

  // ⑤ 重置批量选择状态
  document.getElementById('batchBar').style.display = 'none';
  document.getElementById('selectAll').checked = false;

  // ⑥ 加载数据
  loadData();
}
```

---

## 六、弹窗（Modal）

### 6.1 结构

```html
<div class="modal-overlay" id="userModal">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title" id="modalTitle">新增用户</div>
      <button class="modal-close" onclick="closeModal('userModal')">×</button>
    </div>
    <div class="modal-body">
      <form id="userForm">
        <input type="hidden" id="userId" />
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">姓名</label>
            <input class="form-input" id="userName" />
          </div>
          <div class="form-group">
            <label class="form-label required">账号</label>
            <input class="form-input" id="userAccount" />
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('userModal')">取消</button>
      <button class="btn btn-primary" onclick="saveUser()">确定</button>
    </div>
  </div>
</div>
```

### 6.2 原则

- 使用 `ModalManager.open(id)` / `ModalManager.close(id)` 管理显隐
- 表单用 `id="userForm"` + `reset()` 清空
- 新增/编辑复用同一弹窗，通过 `id="modalTitle"` 动态切换标题
- 必填项用 `class="form-label required"` + `::after{content:' *';color:var(--danger)}`
- 底部按钮：`class="btn-outline"` 取消 + `class="btn-primary"` 确定，右对齐

### 6.3 行内表单（form-row）

```css
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
```

---

## 七、通用组件一览

| 组件 | 类名 | 说明 |
|------|------|------|
| 卡片 | `.content-card` | 通用背景容器 |
| 表格卡片 | `.table-card` | `content-card` + `overflow:hidden` |
| 筛选栏 | `.filter-bar` | 背景提亮，边框，圆角 |
| 批量操作栏 | `.batch-bar` | 蓝底（`primary-light`），边框主色 |
| 分页器 | `.pagination` | `space-between`，左右分布 |
| 状态标签 | `.status-badge` | 圆角胶囊，三种颜色 |
| 用户单元格 | `.user-cell` + `.user-avatar` + `.user-info` | 头像 + 姓名 + 账号 |
| 树形下拉 | `.tree-select` | 参见 dept-tree-select 组件 |
| Toast 提示 | `showToast(msg, type)` | 顶部居中，2s 后消失 |
| 确认弹窗 | `confirmAction(text, callback)` | 全局复用 |

---

## 八、JavaScript 规范

### 8.1 状态变量

```javascript
// 分页
let currentPage = 1;
let pageSize = 20;
let totalCount = 0;

// 视图
let currentView = 'active'; // 'active' | 'deleted'

// 编辑/重置上下文
let editingXxxId = null;
let resettingXxxId = null;
```

### 8.2 API 调用

一律使用 `AuthManager.api(path, options)` 封装，自动携带 Authorization token。

```javascript
async function loadData() {
  const params = new URLSearchParams();
  params.append('page', currentPage);
  params.append('pageSize', pageSize);
  if (keyword) params.append('keyword', keyword);
  // deleted 参数支持视图切换
  params.append('deleted', currentView === 'deleted' ? '1' : '0');

  const res = await AuthManager.api(`/xxx?${params}`);
  const data = await res.json();
  totalCount = data.total || 0;
  renderTable(data.list || []);
}
```

### 8.3 初始化

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadDepartments(), loadRoles()]);
  loadData(); // 页面加载时自动获取列表
});
```

### 8.4 全选复选框

```javascript
document.getElementById('selectAll').addEventListener('change', (e) => {
  document.querySelectorAll('.user-checkbox').forEach(cb => {
    cb.checked = e.target.checked;
  });
  TableBatch.updateBatchBar();
});

document.querySelectorAll('.user-checkbox').forEach(cb => {
  cb.addEventListener('change', () => TableBatch.updateBatchBar());
});
```

---

## 九、目录结构

```
frontend/
├── common.css          ← 全局样式 + CSS 变量（所有新模块共享）
├── common.js           ← 通用组件（AuthManager / ModalManager / TableBatch / showToast）
├── login.html
├── index.html           ← 首页 / dashboard
├── user-management.html ← 用户管理
├── department.html      ← 部门架构
├── role-permission.html ← 角色权限
├── audit-log.html       ← （待开发）
└── system-settings.html  ← （待开发）
```

> 新模块页面放在 `frontend/` 根目录，与现有模块平级。

---

## 十、Git 提交规范

```
feat:   新功能
fix:    修复 bug
style:  样式/UI 调整
refactor: 重构（不影响功能）
chore:  工具/构建/清理
docs:   文档
```

---

*最后更新：2026-04-19 by OpenClaw*
