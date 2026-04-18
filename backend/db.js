const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'ems.db');

let db;
let SQL;

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

async function initDB() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  createTables();
  seedData();
  saveDB();

  return Promise.resolve();
}

function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function get(sql, params = []) {
  const results = all(sql, params);
  return results.length > 0 ? results[0] : undefined;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      dept_id INTEGER,
      role_id INTEGER,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled', 'pending')),
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  // Migration: add deleted_at column if not exists
  {
    var info = db.exec("PRAGMA table_info(users)");
    var hasDeleted = info.length > 0 && info[0].values.some(function(row){ return row[1] === 'deleted_at'; });
    if (!hasDeleted) db.run("ALTER TABLE users ADD COLUMN deleted_at TEXT");
  }
  try {
    db.run("ALTER TABLE users ADD COLUMN deleted_at TEXT");
  } catch (e) {
    if (!e.message.includes("duplicate column")) console.error(e);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      parent_id INTEGER,
      manager TEXT,
      description TEXT,
      location TEXT,
      quota INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (parent_id) REFERENCES departments(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'custom' CHECK(type IN ('system', 'custom')),
      data_scope TEXT DEFAULT 'self' CHECK(data_scope IN ('all', 'dept', 'self')),
      user_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (permission_id) REFERENCES permissions(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      ip TEXT,
      success INTEGER DEFAULT 0,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
}

function seedData() {
  const userCount = get('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count > 0) return;

  console.log('Initializing seed data...');

  const salt = bcrypt.genSaltSync(10);

  // 部门
  const depts = [
    ['集团公司', 'DEPT-ROOT', null, '肖先生', '集团总部', '总部大厦', 200],
    ['技术部', 'DEPT-TECH', 1, '张三', '负责核心产品技术研发', 'A座8层', 50],
    ['前端开发组', 'DEPT-FE', 2, '李四', 'Web前端开发', 'A座8层', 15],
    ['后端开发组', 'DEPT-BE', 2, '王五', '服务端开发', 'A座8层', 20],
    ['产品部', 'DEPT-PM', 1, '孙八', '产品规划与设计', 'A座7层', 25],
    ['销售部', 'DEPT-SALES', 1, '郑十一', '销售业务', 'B座3层', 50],
    ['人力资源部', 'DEPT-HR', 1, '陈十二', '人事管理', 'A座6层', 15],
    ['财务部', 'DEPT-FIN', 1, '林十三', '财务管理', 'A座6层', 12],
  ];
  depts.forEach(d => db.run(
    'INSERT INTO departments (name, code, parent_id, manager, description, location, quota) VALUES (?, ?, ?, ?, ?, ?, ?)', d
  ));

  // 角色
  const roles = [
    ['超级管理员', 'admin', '拥有系统全部权限', 'system', 'all', 1],
    ['部门经理', 'dept_manager', '管理部门成员', 'system', 'dept', 2],
    ['普通员工', 'user', '基础办公权限', 'system', 'self', 2],
  ];
  roles.forEach(r => db.run(
    'INSERT INTO roles (name, code, description, type, data_scope, user_count) VALUES (?, ?, ?, ?, ?, ?)', r
  ));

  // 5个测试账号
  const users = [
    ['admin', bcrypt.hashSync('admin123', salt), '管理员', '13800000001', 'admin@ems.com', 1, 1, 'active'],
    ['zhangsan', bcrypt.hashSync('123456', salt), '张三', '13800000002', 'zhangsan@ems.com', 2, 2, 'active'],
    ['lisi', bcrypt.hashSync('123456', salt), '李四', '13800000003', 'lisi@ems.com', 3, 3, 'active'],
    ['wangwu', bcrypt.hashSync('123456', salt), '王五', '13800000004', 'wangwu@ems.com', 4, 3, 'disabled'],
    ['zhaoliu', bcrypt.hashSync('123456', salt), '赵六', '13800000005', 'zhaoliu@ems.com', 7, 3, 'pending'],
  ];
  users.forEach(u => db.run(
    'INSERT INTO users (username, password, name, phone, email, dept_id, role_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', u
  ));

  // 权限
  const permissions = [
    ['首页概览', 'view-dashboard', '查看仪表盘', '查看首页统计和概览信息'],
    ['首页概览', 'export-dashboard', '导出报表', '导出首页统计数据'],
    ['用户管理', 'user-view', '查看用户列表', '查看系统用户列表'],
    ['用户管理', 'user-create', '新增用户', '创建新用户'],
    ['用户管理', 'user-edit', '编辑用户', '修改用户信息'],
    ['用户管理', 'user-delete', '删除用户', '删除系统用户'],
    ['用户管理', 'user-reset-pwd', '重置密码', '重置用户密码'],
    ['用户管理', 'user-batch', '批量操作', '批量启用/禁用/删除用户'],
    ['部门管理', 'dept-view', '查看部门架构', '查看部门树形结构'],
    ['部门管理', 'dept-create', '新增部门', '创建新部门'],
    ['部门管理', 'dept-edit', '编辑部门', '修改部门信息'],
    ['部门管理', 'dept-delete', '删除部门', '删除部门'],
    ['角色权限', 'role-view', '查看角色列表', '查看系统角色'],
    ['角色权限', 'role-create', '新增角色', '创建新角色'],
    ['角色权限', 'role-edit', '编辑角色', '修改角色和权限配置'],
    ['角色权限', 'role-delete', '删除角色', '删除系统角色'],
  ];
  permissions.forEach(p => db.run(
    'INSERT INTO permissions (module, code, name, description) VALUES (?, ?, ?, ?)', p
  ));

  // 管理员拥有所有权限
  const allPerms = all('SELECT id FROM permissions');
  allPerms.forEach(p => db.run(
    'INSERT INTO role_permissions (role_id, permission_id) VALUES (1, ?)', [p.id]
  ));

  console.log('Seed data initialized successfully.');
}

module.exports = { getDB, initDB, run, all, get, saveDB };
