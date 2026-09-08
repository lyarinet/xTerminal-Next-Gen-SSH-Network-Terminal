Add-Type -AssemblyName System.Drawing

$src = "C:\Users\IAHQ-agaria\.gemini\antigravity-ide\brain\2f031ea9-6c30-4fbc-a929-6136533a693b\ms_store_poster_art_1788807158549.jpg"
$destDir = "c:\Users\IAHQ-agaria\Downloads\xterminal\store_assets\5_microsoft_store"

$img = [System.Drawing.Image]::FromFile($src)
Write-Host "Loaded source image: $($img.Width) x $($img.Height)"

# 1. 1440 x 2160 Ultra-HD PNG
$bmp2160 = New-Object System.Drawing.Bitmap 1440, 2160
$g1 = [System.Drawing.Graphics]::FromImage($bmp2160)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g1.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g1.DrawImage($img, 0, 0, 1440, 2160)
$bmp2160.Save("$destDir\poster_art_1440x2160.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g1.Dispose()
$bmp2160.Dispose()
Write-Host "Saved: $destDir\poster_art_1440x2160.png"

# 2. 720 x 1080 Standard PNG
$bmp1080 = New-Object System.Drawing.Bitmap 720, 1080
$g2 = [System.Drawing.Graphics]::FromImage($bmp1080)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g2.DrawImage($img, 0, 0, 720, 1080)
$bmp1080.Save("$destDir\poster_art_720x1080.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$bmp1080.Dispose()
Write-Host "Saved: $destDir\poster_art_720x1080.png"

$img.Dispose()
