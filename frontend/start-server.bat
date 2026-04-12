@echo off
chcp 65001 >nul
cd /d "E:\AI Project\企业管理系统\frontend"
echo Starting frontend server on port 8080...
node -e "const http=require('http'),fs=require('fs'),path=require('path');const server=http.createServer((req,res)=>{let fp=path.join(__dirname,req.url==='/'?'dashboard.html':req.url);if(!fs.existsSync(fp))fp=path.join(__dirname,'dashboard.html');const ext=path.extname(fp),ct={'html':'text/html','css':'text/css','js':'application/javascript','png':'image/png','jpg':'image/jpeg','gif':'image/gif','ico':'image/x-icon'}[ext.slice(1)]||'text/plain';res.writeHead(200,{'Content-Type':ct});fs.createReadStream(fp).pipe(res);});server.listen(8080,()=>{console.log('Frontend server running on http://localhost:8080');});"
