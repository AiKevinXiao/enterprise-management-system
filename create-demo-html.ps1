# Create GIF from screenshots using .NET
Add-Type -AssemblyName System.Drawing

$imageFolder = "E:\AI Project\企业管理系统\demo-gif"
$outputFile = "E:\AI Project\企业管理系统\demo.gif"
$duration = 2000  # milliseconds per frame

Write-Host "Creating GIF from screenshots..." -ForegroundColor Cyan

# Get all PNG files sorted
$imageFiles = Get-ChildItem -Path $imageFolder -Filter "*.png" | Sort-Object Name

if ($imageFiles.Count -eq 0) {
    Write-Host "No PNG files found!" -ForegroundColor Red
    exit
}

Write-Host "Found $($imageFiles.Count) images" -ForegroundColor Green

# For now, create a simple HTML slideshow as alternative
# since .NET GIF encoding on Windows PowerShell is complex

$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Enterprise Management System - Demo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            background: #0F172A; 
            color: #fff; 
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
        }
        h1 { margin-bottom: 20px; font-size: 24px; }
        .slideshow { 
            max-width: 1200px; 
            width: 100%;
            background: #1E293B;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .slide { display: none; }
        .slide.active { display: block; }
        .slide img { width: 100%; display: block; }
        .slide-title { 
            padding: 16px 20px; 
            font-size: 14px; 
            color: #94A3B8;
            border-top: 1px solid #334155;
        }
        .controls {
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 20px;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            background: #3B82F6;
            color: white;
            cursor: pointer;
            font-size: 14px;
        }
        .btn:hover { background: #2563EB; }
        .progress {
            display: flex;
            justify-content: center;
            gap: 8px;
            padding: 10px;
        }
        .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #334155;
            cursor: pointer;
        }
        .dot.active { background: #3B82F6; }
        .auto-play {
            padding: 10px 20px;
            color: #94A3B8;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <h1>🏢 Enterprise Management System Demo</h1>
    <div class="slideshow">
"@

$index = 0
foreach ($file in $imageFiles) {
    $imgName = $file.Name
    $title = $imgName -replace "^\d+_", "" -replace "\.png$", "" -replace "_", " "
    $active = if ($index -eq 0) { "active" } else { "" }
    $htmlContent += @"
        <div class="slide $active" data-index="$index">
            <img src="demo-gif/$imgName" alt="$title">
            <div class="slide-title">$($index + 1). $title</div>
        </div>
"@
    $index++
}

$htmlContent += @"
    </div>
    <div class="progress">
"@

for ($i = 0; $i -lt $imageFiles.Count; $i++) {
    $active = if ($i -eq 0) { "active" } else { "" }
    $htmlContent += "        <div class='dot $active' onclick='showSlide($i)'></div>`n"
}

$htmlContent += @"
    </div>
    <div class="controls">
        <button class="btn" onclick="prevSlide()">◀ Previous</button>
        <button class="btn" onclick="toggleAutoPlay()">⏯ Auto Play</button>
        <button class="btn" onclick="nextSlide()">Next ▶</button>
    </div>
    <div class="auto-play" id="autoPlayStatus">Auto-play: OFF</div>
    
    <script>
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        const dots = document.querySelectorAll('.dot');
        const totalSlides = slides.length;
        let autoPlayInterval = null;
        
        function showSlide(index) {
            slides.forEach(s => s.classList.remove('active'));
            dots.forEach(d => d.classList.remove('active'));
            slides[index].classList.add('active');
            dots[index].classList.add('active');
            currentSlide = index;
        }
        
        function nextSlide() {
            showSlide((currentSlide + 1) % totalSlides);
        }
        
        function prevSlide() {
            showSlide((currentSlide - 1 + totalSlides) % totalSlides);
        }
        
        function toggleAutoPlay() {
            if (autoPlayInterval) {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
                document.getElementById('autoPlayStatus').textContent = 'Auto-play: OFF';
            } else {
                autoPlayInterval = setInterval(nextSlide, 2000);
                document.getElementById('autoPlayStatus').textContent = 'Auto-play: ON (2s)';
            }
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
            if (e.key === ' ') toggleAutoPlay();
        });
    </script>
</body>
</html>
"@

$outputPath = "E:\AI Project\企业管理系统\demo.html"
$htmlContent | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Demo Created!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "HTML Demo: $outputPath" -ForegroundColor Cyan
Write-Host "Screenshots: $imageFolder" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features:" -ForegroundColor Yellow
Write-Host "  - Click dots to jump to specific slide" -ForegroundColor White
Write-Host "  - Use arrow keys to navigate" -ForegroundColor White
Write-Host "  - Click 'Auto Play' for slideshow (2s per slide)" -ForegroundColor White
Write-Host "  - Press Space to toggle auto-play" -ForegroundColor White
Write-Host ""

Start-Process $outputPath
