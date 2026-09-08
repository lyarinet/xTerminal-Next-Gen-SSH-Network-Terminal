Add-Type -AssemblyName System.Drawing

$storeDir = "c:\Users\IAHQ-agaria\Downloads\xterminal\store_assets"
$msDir = "$storeDir\5_microsoft_store"
New-Item -ItemType Directory -Force -Path $msDir | Out-Null

Write-Host "Creating Microsoft Store 1080x1080 and 2160x2160 PNG Box Art..."

# Source master HD icon
$srcLogo = "$storeDir\1_app_icon\x_bracket_logo_master_hd.jpg"
if (-not (Test-Path $srcLogo)) {
    $srcLogo = "$storeDir\1_app_icon\x_bracket_logo_extracted.png"
}

$img = [System.Drawing.Image]::FromFile($srcLogo)

# 1. 1080x1080 Box Art PNG
$bmp1080 = New-Object System.Drawing.Bitmap 1080, 1080
$g1 = [System.Drawing.Graphics]::FromImage($bmp1080)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g1.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g1.DrawImage($img, 0, 0, 1080, 1080)
$bmp1080.Save("$msDir\box_art_1080x1080.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g1.Dispose()
$bmp1080.Dispose()
Write-Host "Created: $msDir\box_art_1080x1080.png"

# 2. 2160x2160 Box Art PNG
$bmp2160 = New-Object System.Drawing.Bitmap 2160, 2160
$g2 = [System.Drawing.Graphics]::FromImage($bmp2160)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g2.DrawImage($img, 0, 0, 2160, 2160)
$bmp2160.Save("$msDir\box_art_2160x2160.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$bmp2160.Dispose()
Write-Host "Created: $msDir\box_art_2160x2160.png"

# 3. 2:3 Poster Art (720x1080 PNG)
$bmpPoster = New-Object System.Drawing.Bitmap 720, 1080
$g3 = [System.Drawing.Graphics]::FromImage($bmpPoster)
$g3.Clear([System.Drawing.Color]::FromArgb(9, 13, 22))
$g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g3.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g3.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
# Draw logo centered in the poster
$logoSize = 640
$logoX = (720 - $logoSize) / 2
$logoY = (1080 - $logoSize) / 2
$g3.DrawImage($img, $logoX, $logoY, $logoSize, $logoSize)
$bmpPoster.Save("$msDir\poster_art_720x1080.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g3.Dispose()
$bmpPoster.Dispose()
Write-Host "Created: $msDir\poster_art_720x1080.png"

$img.Dispose()

# 4. Check & Prepare 1920x1080 Screenshots (PNG)
$screenDir = "$storeDir\4_screenshots_tablet_desktop"
$screenFiles = Get-ChildItem "$screenDir\*.png"

foreach ($file in $screenFiles) {
    $sImg = [System.Drawing.Image]::FromFile($file.FullName)
    Write-Host "Checking screenshot $($file.Name): $($sImg.Width) x $($sImg.Height)"
    
    # If width is less than 1366, upscale to 1920x1080
    if ($sImg.Width -lt 1366 -or $sImg.Height -lt 768) {
        $sBmp = New-Object System.Drawing.Bitmap 1920, 1080
        $sG = [System.Drawing.Graphics]::FromImage($sBmp)
        $sG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $sG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $sG.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $sG.DrawImage($sImg, 0, 0, 1920, 1080)
        $sBmp.Save("$msDir\$($file.Name)", [System.Drawing.Imaging.ImageFormat]::Png)
        $sG.Dispose()
        $sBmp.Dispose()
        Write-Host "Upscaled to 1920x1080: $msDir\$($file.Name)"
    } else {
        Copy-Item $file.FullName "$msDir\$($file.Name)" -Force
        Write-Host "Copied valid screenshot: $msDir\$($file.Name)"
    }
    $sImg.Dispose()
}

Write-Host "ALL MICROSOFT STORE ASSETS READY in $msDir!"
