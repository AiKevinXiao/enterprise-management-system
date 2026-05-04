process.chdir('E:/AI_Project/企业管理系统/backend');
const mysql = require('mysql2/promise');
(async () => {
  const p = await mysql.createPool({host:'localhost',port:3306,user:'root',password:'1qaz@WSX',database:'ems'});
  const [r] = await p.execute('SELECT id, username, name, status, deleted_at FROM users ORDER BY id');
  r.forEach(u => console.log(`#${u.id} ${u.username} ${u.name} status=${u.status} deleted_at=${u.deleted_at}`));
  await p.end();
})();
