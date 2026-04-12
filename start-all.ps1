# 启动前后端服务
$backendDir = "E:\ems-backend"
$frontendDir = "E:\AI Project\企业管理系统\frontend"

Write-Host "Starting backend on port 3000..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; node app.js" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Starting frontend on port 8080..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; node -e \"const http=require('http'),fs=require('fs'),path=require('path');http.createServer((req,res)=>{let fp=path.join(__dirname,req.url==='/'?'dashboard.html':req.url);if(!fs.existsSync(fp))fp=path.join(__dirname,'dashboard.html');const ext=path.extname(fp),ct={'html':'text/html','css':'text/css','js':'application/javascript'}[ext.slice(1)]||'text/plain';res.writeHead(200,{'Content-Type':ct,'Access-Control-Allow-Origin':'*'});fs.createReadStream(fp).pipe(res);}).listen(8080,()=>{console.log('Frontend: http://localhost:8080');});\"" -WindowStyle Normal

Write-Host ""
Write-Host "======================================"
Write-Host "Services started:"
Write-Host "  Backend API: http://localhost:3000"
Write-Host "  Frontend:    http://localhost:8080"
Write-Host "  Login:       http://localhost:8080/login.html"
Write-Host "======================================"
Write-Host ""
Write-Host "Press Enter to exit..."
Read-Host
