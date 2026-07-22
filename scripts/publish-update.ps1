param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d+\.\d+\.\d+$')]
  [string]$Version,

  [string]$ProjectPath = "D:\valueplus-system"
)

$ErrorActionPreference = "Stop"

function Set-VersionInFile {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Replacement
  )

  $content = Get-Content -LiteralPath $Path -Raw -Encoding utf8
  $updated = [regex]::Replace(
    $content,
    $Pattern,
    $Replacement,
    [System.Text.RegularExpressions.RegexOptions]::Multiline,
    [TimeSpan]::FromSeconds(2)
  )

  if ($updated -eq $content) {
    throw "Version pattern was not found or already has the requested value: $Path"
  }

  [System.IO.File]::WriteAllText(
    $Path,
    $updated,
    [System.Text.UTF8Encoding]::new($false)
  )
}

if (-not (Test-Path -LiteralPath $ProjectPath -PathType Container)) {
  throw "Project folder not found: $ProjectPath"
}

Push-Location $ProjectPath

try {
  $branch = (git branch --show-current).Trim()

  if ($branch -ne "main") {
    throw "Please publish from the main branch. Current branch: $branch"
  }

  if (git status --porcelain) {
    throw "Working tree is not clean. Commit or stash current changes first."
  }

  git fetch origin
  git pull --ff-only origin main

  if ($LASTEXITCODE -ne 0) {
    throw "Unable to update main from origin."
  }

  $tag = "v$Version"

  if (git tag --list $tag) {
    throw "Tag already exists: $tag"
  }

  Write-Host "Updating ValuePlus System to $Version..." -ForegroundColor Cyan

  Set-VersionInFile `
    -Path (Join-Path $ProjectPath "package.json") `
    -Pattern '(?m)^(\s*"version"\s*:\s*")\d+\.\d+\.\d+("\s*,)' `
    -Replacement "`${1}$Version`${2}"

  Set-VersionInFile `
    -Path (Join-Path $ProjectPath "src-tauri\tauri.conf.json") `
    -Pattern '(?m)^(\s*"version"\s*:\s*")\d+\.\d+\.\d+("\s*,)' `
    -Replacement "`${1}$Version`${2}"

  Set-VersionInFile `
    -Path (Join-Path $ProjectPath "src-tauri\Cargo.toml") `
    -Pattern '(?m)^(version\s*=\s*")\d+\.\d+\.\d+("\s*)$' `
    -Replacement "`${1}$Version`${2}"

  $pnpm = Join-Path $env:APPDATA "npm\pnpm.cmd"

  if (-not (Test-Path -LiteralPath $pnpm -PathType Leaf)) {
    $pnpmCommand = Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue

    if ($null -eq $pnpmCommand) {
      throw "pnpm.cmd was not found."
    }

    $pnpm = $pnpmCommand.Source
  }

  Write-Host "Validating frontend build..." -ForegroundColor Yellow
  & $pnpm build

  if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed. Version files remain changed for inspection."
  }

  Write-Host "Refreshing Cargo.lock..." -ForegroundColor Yellow
  cargo metadata `
    --manifest-path ".\src-tauri\Cargo.toml" `
    --format-version 1 `
    --no-deps | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "Cargo validation failed. Version files remain changed for inspection."
  }

  git add `
    package.json `
    src-tauri/tauri.conf.json `
    src-tauri/Cargo.toml `
    src-tauri/Cargo.lock

  git commit -m "Release ValuePlus System $Version"

  if ($LASTEXITCODE -ne 0) {
    throw "Unable to create the release commit."
  }

  git tag -a $tag -m "ValuePlus System $Version"
  git push origin main

  if ($LASTEXITCODE -ne 0) {
    throw "Unable to push the release commit. The tag has not been pushed."
  }

  git push origin $tag

  if ($LASTEXITCODE -ne 0) {
    throw "Unable to push tag $tag."
  }

  Write-Host "Release $Version was queued successfully." -ForegroundColor Green
  Write-Host "GitHub Actions is now building the signed Windows update." -ForegroundColor Cyan
  Write-Host "After the workflow finishes, test the Update Center from an older installed version." -ForegroundColor Yellow
} finally {
  Pop-Location
}
