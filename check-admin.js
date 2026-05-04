process.chdir('E:/AI_Project/企业管理系统/backend');
const mysql = require('mysql2/promise');
(async () => {
  const p = await mysql.createPool({host:'localhost',port:3306,user:'root',password:'1qaz@WSX',database:'ems'});
  const [r] = await p.execute('SELECT id, username, password FROM users WHERE username = ?', ['admin']);
  console.log(JSON.stringify(r));
  await p.end();
})();
