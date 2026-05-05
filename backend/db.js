const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1qaz@WSX',
  database: process.env.DB_NAME || 'ems',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
};

let pool;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
}

// ─── 建表 SQL ─────────────────────────────────────────
const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS departments (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) DEFAULT NULL,
    parent_id INT DEFAULT NULL,
    manager VARCHAR(50) DEFAULT NULL,
    description TEXT,
    location VARCHAR(100) DEFAULT NULL,
    quota INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    deleted_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY code (code),
    KEY parent_id (parent_id),
    CONSTRAINT departments_ibfk_1 FOREIGN KEY (parent_id) REFERENCES departments (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    dept_id INT DEFAULT NULL,
    role_id INT DEFAULT NULL,
    status ENUM('active','disabled','pending') DEFAULT 'active',
    last_login DATETIME DEFAULT NULL,
    deleted_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS roles (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    type ENUM('system','custom') DEFAULT 'custom',
    data_scope ENUM('all','dept','self') DEFAULT 'self',
    user_count INT DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY name (name),
    UNIQUE KEY code (code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS permissions (
    id INT NOT NULL AUTO_INCREMENT,
    module VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    PRIMARY KEY (id),
    UNIQUE KEY code (code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    KEY permission_id (permission_id),
    CONSTRAINT role_permissions_ibfk_1 FOREIGN KEY (role_id) REFERENCES roles (id),
    CONSTRAINT role_permissions_ibfk_2 FOREIGN KEY (permission_id) REFERENCES permissions (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS login_logs (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) DEFAULT NULL,
    ip VARCHAR(45) DEFAULT NULL,
    success TINYINT(1) DEFAULT 0,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

// ─── 迁移：检查并补充缺失的列 ──────────────────────────
const MIGRATIONS = [
  {
    table: 'departments',
    column: 'status',
    check: `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'status'`,
    apply: `ALTER TABLE departments ADD COLUMN status VARCHAR(20) DEFAULT 'active' AFTER quota`,
    post: `UPDATE departments SET status = 'active' WHERE status IS NULL`,
  },
];

async function initDB() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }

  // 测试连接
  const conn = await pool.getConnection();
  console.log('MySQL connected:', DB_CONFIG.host + ':' + DB_CONFIG.port + '/' + DB_CONFIG.database);
  conn.release();

  // 1. 建表（IF NOT EXISTS，幂等）
  for (const sql of CREATE_TABLES) {
    await pool.execute(sql);
  }
  console.log('Tables ensured.');

  // 2. 迁移（按需补充列）
  for (const m of MIGRATIONS) {
    const [rows] = await pool.execute(m.check);
    if (rows[0].cnt === 0) {
      await pool.execute(m.apply);
      if (m.post) await pool.execute(m.post);
      console.log(`Migration applied: ${m.table}.${m.column}`);
    }
  }

  // 3. 种子数据（仅 users 表为空时）
  const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM users');
  if (rows[0].cnt === 0) {
    await seedData();
  }

  return pool;
}

async function run(sql, params = []) {
  const p = await getPool();
  const [result] = await p.execute(sql, params);
  return {
    lastID: result.insertId || null,
    changes: result.affectedRows || 0
  };
}

async function all(sql, params = []) {
  const p = await getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows.length > 0 ? rows[0] : undefined;
}

async function seedData() {
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
  for (const d of depts) {
    await run(
      'INSERT INTO departments (name, code, parent_id, manager, description, location, quota) VALUES (?, ?, ?, ?, ?, ?, ?)', d
    );
  }

  // 角色
  const roles = [
    ['超级管理员', 'admin', '拥有系统全部权限', 'system', 'all', 1],
    ['部门经理', 'dept_manager', '管理部门成员', 'custom', 'dept', 2],
    ['普通员工', 'user', '基础办公权限', 'custom', 'self', 2],
  ];
  for (const r of roles) {
    await run(
      'INSERT INTO roles (name, code, description, type, data_scope, user_count) VALUES (?, ?, ?, ?, ?, ?)', r
    );
  }

  // 测试账号
  const users = [
    ['admin', bcrypt.hashSync('admin123', salt), '管理员', '13800000001', 'admin@ems.com', 1, 1, 'active'],
    ['zhangsan', bcrypt.hashSync('123456', salt), '张三', '13800000002', 'zhangsan@ems.com', 2, 2, 'active'],
    ['lisi', bcrypt.hashSync('123456', salt), '李四', '13800000003', 'lisi@ems.com', 3, 3, 'active'],
    ['wangwu', bcrypt.hashSync('123456', salt), '王五', '13800000004', 'wangwu@ems.com', 4, 3, 'disabled'],
    ['zhaoliu', bcrypt.hashSync('123456', salt), '赵六', '13800000005', 'zhaoliu@ems.com', 7, 3, 'pending'],
  ];
  for (const u of users) {
    await run(
      'INSERT INTO users (username, password, name, phone, email, dept_id, role_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', u
    );
  }

  // 权限
  const permissions = [
    ['首页', 'view-dashboard', '查看首页', '查看首页统计和概览信息'],
    ['用户', 'user-view', '查看用户列表', '查看系统用户列表'],
    ['用户', 'user-create', '新增用户', '创建新用户'],
    ['用户', 'user-edit', '编辑用户', '修改用户信息'],
    ['用户', 'user-delete', '删除用户', '删除系统用户'],
    ['用户', 'user-reset-pwd', '重置密码', '重置用户密码'],
    ['用户', 'user-restore', '恢复用户', '查看回收站并恢复已删除用户'],
    ['部门架构', 'dept-view', '查看部门架构', '查看部门树形结构'],
    ['部门架构', 'dept-create', '新增部门', '创建新部门'],
    ['部门架构', 'dept-edit', '编辑部门', '修改部门信息'],
    ['部门架构', 'dept-delete', '删除部门', '删除部门'],
    ['角色权限', 'role-view', '查看角色列表', '查看系统角色'],
    ['角色权限', 'role-create', '新增角色', '创建新角色'],
    ['角色权限', 'role-edit', '编辑角色', '修改角色和权限配置'],
    ['角色权限', 'role-delete', '删除角色', '删除系统角色'],
    ['角色权限', 'role-restore', '恢复角色', '从回收站恢复已删除角色'],
  ];
  for (const p of permissions) {
    await run(
      'INSERT INTO permissions (module, code, name, description) VALUES (?, ?, ?, ?)', p
    );
  }

  // 角色权限分配
  const permRows = await all('SELECT id, code FROM permissions');
  const permMap = {};
  permRows.forEach(p => { permMap[p.code] = p.id; });

  const rolePermMap = {
    1: permRows.map(p => p.id), // admin: 全部
    2: ['view-dashboard', 'user-view', 'user-create', 'user-edit',
        'dept-view', 'dept-create', 'dept-edit', 'role-view', 'role-delete', 'role-restore'].map(c => permMap[c]).filter(Boolean),
    3: ['view-dashboard', 'user-view', 'dept-view'].map(c => permMap[c]).filter(Boolean),
  };

  for (const [roleId, permIds] of Object.entries(rolePermMap)) {
    for (const pid of permIds) {
      await run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, pid]);
    }
  }

  console.log('Seed data initialized successfully.');
}

module.exports = { getPool, initDB, run, all, get };
