/**
 * 数据迁移脚本：从 SQLite (export.json) 导入 MySQL
 * 用法：node data/migrate-to-mysql.js
 */
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'export.json'), 'utf8'));

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

function buildInsert(tableName, columns, rows) {
  if (!rows || rows.length === 0) return '';
  const cols = columns.join(', ');
  const values = rows.map(row =>
    '(' + row.map(v => esc(v)).join(', ') + ')'
  ).join(',\n');
  return `INSERT INTO ${tableName} (${cols}) VALUES\n${values};\n`;
}

let sql = 'SET FOREIGN_KEY_CHECKS=0;\n\n';

// departments: export has [id, name, code, parent_id, manager, description, location, quota, created_at]
sql += buildInsert('departments',
  ['id', 'name', 'code', 'parent_id', 'manager', 'description', 'location', 'quota', 'created_at'],
  data.departments
);

// roles: export has [id, name, code, description, type, data_scope, user_count, deleted_at, created_at]
sql += '\n' + buildInsert('roles',
  ['id', 'name', 'code', 'description', 'type', 'data_scope', 'user_count', 'deleted_at', 'created_at'],
  data.roles
);

// permissions
sql += '\n' + buildInsert('permissions',
  ['id', 'module', 'code', 'name', 'description'],
  data.permissions
);

// role_permissions
sql += '\n' + buildInsert('role_permissions',
  ['role_id', 'permission_id'],
  data.role_permissions
);

// users
sql += '\n' + buildInsert('users',
  ['id', 'username', 'password', 'name', 'phone', 'email', 'dept_id', 'role_id', 'status', 'last_login', 'deleted_at', 'created_at', 'updated_at'],
  data.users
);

// login_logs
sql += '\n' + buildInsert('login_logs',
  ['id', 'username', 'ip', 'success', 'message', 'created_at'],
  data.login_logs
);

sql += '\nSET FOREIGN_KEY_CHECKS=1;\n';

const outPath = path.join(__dirname, 'import.sql');
fs.writeFileSync(outPath, sql, 'utf8');

console.log(`Generated ${outPath}`);
console.log(`  departments: ${data.departments.length} rows`);
console.log(`  roles: ${data.roles.length} rows`);
console.log(`  permissions: ${data.permissions.length} rows`);
console.log(`  role_permissions: ${data.role_permissions.length} rows`);
console.log(`  users: ${data.users.length} rows`);
console.log(`  login_logs: ${data.login_logs.length} rows`);
