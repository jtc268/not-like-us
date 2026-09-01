param(
  [Parameter(Mandatory = $true)][string]$Image,
  [Parameter(Mandatory = $true)][string]$ArtifactRoot
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $ArtifactRoot -Force | Out-Null
$tarPath = Join-Path $ArtifactRoot 'image.tar'
$gzipPath = Join-Path $ArtifactRoot 'image.tar.gz'

docker save -o $tarPath $Image
if ($LASTEXITCODE -ne 0) { throw 'docker save failed' }

$inputStream = [IO.File]::OpenRead($tarPath)
$outputStream = [IO.File]::Create($gzipPath)
$gzipStream = [IO.Compression.GZipStream]::new($outputStream, [IO.Compression.CompressionLevel]::Fastest)
try {
  $inputStream.CopyTo($gzipStream)
} finally {
  $gzipStream.Dispose()
  $outputStream.Dispose()
  $inputStream.Dispose()
}

$resolvedTar = (Resolve-Path -LiteralPath $tarPath).Path
if ($resolvedTar -ne $tarPath) { throw 'Unexpected tar path' }
Remove-Item -LiteralPath $tarPath -Force

$chunkSize = 20MB
$sourceStream = [IO.File]::OpenRead($gzipPath)
$buffer = [byte[]]::new($chunkSize)
$chunkIndex = 0
$manifestLines = [Collections.Generic.List[string]]::new()
try {
  while (($bytesRead = $sourceStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
    $suffix = ([string][char][int](97 + [math]::Floor($chunkIndex / 26))) + ([string][char][int](97 + ($chunkIndex % 26)))
    $chunkName = "image.tar.gz.part-$suffix"
    $chunkPath = Join-Path $ArtifactRoot $chunkName
    $chunkStream = [IO.File]::Create($chunkPath)
    try {
      $chunkStream.Write($buffer, 0, $bytesRead)
    } finally {
      $chunkStream.Dispose()
    }
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $chunkPath).Hash.ToLowerInvariant()
    $manifestLines.Add("$hash  $chunkName")
    $chunkIndex++
  }
} finally {
  $sourceStream.Dispose()
}

[IO.File]::WriteAllText(
  (Join-Path $ArtifactRoot 'chunks.sha256'),
  (($manifestLines -join "`n") + "`n"),
  [Text.UTF8Encoding]::new($false)
)

[pscustomobject]@{
  Archive = (Get-Item $gzipPath).Length
  ArchiveSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $gzipPath).Hash.ToLowerInvariant()
  Chunks = $chunkIndex
  ImageId = (docker image inspect $Image --format '{{.Id}}')
}
