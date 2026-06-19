Add-Type -AssemblyName System.Drawing
$src = 'C:\Users\Riad\.gemini\antigravity\brain\61307c75-3acd-4776-a3f9-aec7bb84cb94\dz_file_icon_1781878936357.png'
$dst = 'd:\Programing\Djazair Programming Language\djazair-vs-extension\images\dz-file-icon.png'
New-Item -ItemType Directory -Force -Path 'd:\Programing\Djazair Programming Language\djazair-vs-extension\images' | Out-Null
$img = [System.Drawing.Image]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap(32, 32)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 32, 32)
$bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$img.Dispose()
Write-Host "Icon saved to $dst"
