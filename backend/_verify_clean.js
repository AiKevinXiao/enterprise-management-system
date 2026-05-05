const mysql = require('mysql2/promise');
(async () => {
  const p = mysql.createPool({ host: 'localhost', port: 3306, user: 'root', password: '1qaz@WSX', database: 'ems' });
  const [[u], [r], [d], [rp]] = await Promise.all([
    p.query('SELECT COUNT(*) as cnt FROM users'),
    p.query('SELECT COUNT(*) as cnt FROM roles WHERE deleted_at IS NULL'),
    p.query('SELECT COUNT(*) as cnt FROM departments'),
    p.query('SELECT role_id, GROUP_CONCAT(permission_id ORDER BY permission_id) as pids FROM role_permissions WHERE role_id <= 3 GROUP BY role_id'),
  ]);
  const r2 = await p.query('SELECT role_id, COUNT(*) as cnt FROM role_permissions WHERE role_id > 3');
  console.log('Users:', u[0].cnt, '(seed: 5)');
  console.log('Roles (active):', r[0].cnt, '(seed: 3)');
  console.log('Departments:', d[0].cnt, '(seed: 8)');
  console.log('Seed role_permissions:');
  rp.forEach(x => console.log('  role', x.role_id, ':', x.pids, '(count=' + x.pids.split(',').length + ')'));
  console.log('Non-seed role_permissions:', r2[0].length);
  await p.end();
  process.exit(r2[0].length > 0 ? 1 : 0);
})();
