# Simple HTTP Server for Windows (PowerShell)
param([int]$Port = 8888)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$Port/")
$listener.Start()

$root = Resolve-Path "$PSScriptRoot\frontend"

Write-Host "HTTP Server started at http://localhost:$Port/"
Write-Host "Serving directory: $root"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $url = $request.Url.LocalPath
    if ($url -eq '/') { $url = '/login.html' }
    $filePath = Join-Path $root ($url -replace '^/', '')
    
    if (Test-Path $filePath -PathType Container) {
        $indexPath = Join-Path $filePath "index.html"
        if (Test-Path $indexPath) { $filePath = $indexPath }
    }
    
    if (Test-Path $filePath -PathType Leaf) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentLength64 = $content.Length
        
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        switch ($ext) {
            '.html' { $response.ContentType = 'text/html; charset=utf-8' }
            '.css'  { $response.ContentType = 'text/css; charset=utf-8' }
            '.js'   { $response.ContentType = 'application/javascript; charset=utf-8' }
            '.json' { $response.ContentType = 'application/json; charset=utf-8' }
            '.png'  { $response.ContentType = 'image/png' }
            default { $response.ContentType = 'application/octet-stream' }
        }
        
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
        $buffer = [System.Text.Encoding]::UTF8.GetBytes("Not found: $url")
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
    }
    
    $response.Close()
}

$listener.Stop()
