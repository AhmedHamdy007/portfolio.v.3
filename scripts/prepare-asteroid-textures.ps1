$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$albumRoot = Join-Path $PSScriptRoot '../public/models'
$albumBytes = [System.IO.File]::ReadAllBytes((Join-Path $albumRoot 'wandering_asteroids_of_andromeda.glb'))
$albumJsonLength = [BitConverter]::ToUInt32($albumBytes, 12)
$albumJson = [Text.Encoding]::UTF8.GetString($albumBytes, 20, $albumJsonLength) | ConvertFrom-Json
$albumOutput = Join-Path $albumRoot 'album'
[System.IO.Directory]::CreateDirectory($albumOutput) | Out-Null
for ($albumIndex = 0; $albumIndex -lt $albumJson.materials.Count; $albumIndex++) {
  $albumMaterial = $albumJson.materials[$albumIndex]
  foreach ($albumKind in @('color', 'normal', 'ao')) {
    $albumTextureIndex = if ($albumKind -eq 'color') { $albumMaterial.extensions.KHR_materials_pbrSpecularGlossiness.diffuseTexture.index } elseif ($albumKind -eq 'ao') { $albumMaterial.occlusionTexture.index } else { $albumMaterial.normalTexture.index }
    $albumImage = $albumJson.images[$albumJson.textures[$albumTextureIndex].source]
    $albumView = $albumJson.bufferViews[$albumImage.bufferView]
    $albumStream = [IO.MemoryStream]::new($albumBytes, (28 + $albumJsonLength + $albumView.byteOffset), $albumView.byteLength)
    $albumBitmap = [Drawing.Image]::FromStream($albumStream)
    $albumLimit = if ($albumKind -eq 'color') { 1024 } else { 512 }
    $albumRatio = [Math]::Min([double]1, [double]$albumLimit / [Math]::Max($albumBitmap.Width, $albumBitmap.Height))
    $albumResized = [Drawing.Bitmap]::new([int]($albumBitmap.Width * $albumRatio), [int]($albumBitmap.Height * $albumRatio))
    $albumGraphics = [Drawing.Graphics]::FromImage($albumResized)
    $albumGraphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $albumGraphics.DrawImage($albumBitmap, 0, 0, $albumResized.Width, $albumResized.Height)
    $albumExtension = if ($albumKind -eq 'normal') { 'png' } else { 'jpg' }
    $albumFormat = if ($albumKind -eq 'normal') { [Drawing.Imaging.ImageFormat]::Png } else { [Drawing.Imaging.ImageFormat]::Jpeg }
    $albumResized.Save((Join-Path $albumOutput "asteroid-$albumKind-$albumIndex.$albumExtension"), $albumFormat)
    $albumGraphics.Dispose(); $albumResized.Dispose(); $albumBitmap.Dispose(); $albumStream.Dispose()
  }
}
Get-ChildItem $albumOutput -Filter 'asteroid-*' | Select-Object Name, Length
