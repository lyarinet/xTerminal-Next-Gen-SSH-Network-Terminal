Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\IAHQ-agaria\.gemini\antigravity-ide\brain\2f031ea9-6c30-4fbc-a929-6136533a693b\mobile_promo_telemetry_1788786890592.jpg"
$destPath = "c:\Users\IAHQ-agaria\Downloads\xterminal\store_assets\1_app_icon\x_bracket_logo_extracted.png"

$img = [System.Drawing.Image]::FromFile($srcPath)

# Exact bounding box for the rounded square logo icon
$cropX = 538
$cropY = 56
$cropW = 166
$cropH = 166

$cropRect = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropW, $cropH
# Output as 512x512 high quality square
$bmp = New-Object System.Drawing.Bitmap 512, 512
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, 512, 512), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bmp.Dispose()
$img.Dispose()

Write-Host "Perfect logo saved to: $destPath"
