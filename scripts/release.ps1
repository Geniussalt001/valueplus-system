param(
  [Parameter(Mandatory = $true)]
  [string]$Version,

  [Parameter(Mandatory = $true)]
  [string]$Notes,

  [string]$GitHubOwner = "Geniussalt001",

  [string]$ReleaseRepository = "valueplus-system-releases",

  [string]$PrivateKeyPath = "$env:USERPROFILE\.tauri\valueplus-system.key"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
  param(
    [string]$Message
  )

  Write-Host ""
  Write-Host "========================================" -ForegroundColor DarkCyan
  Write-Host $Message -ForegroundColor Cyan
  Write-Host "========================================" -ForegroundColor DarkCyan
}

function Write-Utf8File {
  param(
    [string]$Path,
    [string]$Content
  )

  $encoding = New-Object System.Text.UTF8Encoding

  [System.IO.File]::WriteAllText(
    $Path,
    $Content,
    $encoding
  )
}

function Set-JsonVersion {
  param(
    [string]$Path,
    [string]$NextVersion
  )

  if (!(Test-Path -LiteralPath $Path)) {
    throw "File not found: $Path"
  }

  $document = Get-Content `
    -LiteralPath $Path `
    -Raw |
    ConvertFrom-Json

  if ($null -eq $document.version) {
    throw "Version property not found: $Path"
  }

  $document.version = $NextVersion

  $json = $document |
    ConvertTo-Json -Depth 20

  Write-Utf8File `
    -Path $Path `
    -Content $json
}

function Set-CargoVersion {
  param(
    [string]$Path,
    [string]$NextVersion
  )

  if (!(Test-Path -LiteralPath $Path)) {
    throw "File not found: $Path"
  }

  $content = Get-Content `
    -LiteralPath $Path `
    -Raw

  $versionPattern =
    '(?m)^version\s*=\s*"[^"]+"'

  $versionRegex =
    New-Object `
      System.Text.RegularExpressions.Regex(
        $versionPattern
      )

  if (!$versionRegex.IsMatch($content)) {
    throw "Package version not found in Cargo.toml"
  }

  $replacement =
    "version = `"$NextVersion`""

  $updated = $versionRegex.Replace(
    $content,
    $replacement,
    1
  )

  Write-Utf8File `
    -Path $Path `
    -Content $updated
}

$Version = $Version.Trim()

if ($Version.StartsWith("v")) {
  $Version = $Version.Substring(1)
}

if (
  $Version -notmatch
  '^\d+\.\d+\.\d+$'
) {
  throw "Version must use SemVer format, for example 1.0.2"
}

$projectRoot = Split-Path `
  -Parent `
  $PSScriptRoot

$packageJsonPath = Join-Path `
  $projectRoot `
  "package.json"

$tauriConfigPath = Join-Path `
  $projectRoot `
  "src-tauri\tauri.conf.json"

$cargoTomlPath = Join-Path `
  $projectRoot `
  "src-tauri\Cargo.toml"

$bundleFolder = Join-Path `
  $projectRoot `
  "src-tauri\target\release\bundle\nsis"

$releaseFolder = Join-Path `
  $projectRoot `
  "release\v$Version"

$sourceExeName =
  "ValuePlus System_${Version}_x64-setup.exe"

$sourceExe = Join-Path `
  $bundleFolder `
  $sourceExeName

$sourceSig = "$sourceExe.sig"

$releaseExeName =
  "ValuePlus.System_${Version}_x64-setup.exe"

$releaseExe = Join-Path `
  $releaseFolder `
  $releaseExeName

$releaseSig = "$releaseExe.sig"

$latestJsonPath = Join-Path `
  $releaseFolder `
  "latest.json"

$packageBackup = Get-Content `
  -LiteralPath $packageJsonPath `
  -Raw

$tauriBackup = Get-Content `
  -LiteralPath $tauriConfigPath `
  -Raw

$cargoBackup = Get-Content `
  -LiteralPath $cargoTomlPath `
  -Raw

$releaseCompleted = $false

try {
  Write-Step "Step 1/7 - Validate release information"

  Write-Host "Project: $projectRoot"
  Write-Host "Version: $Version"
  Write-Host "Notes: $Notes"
  Write-Host "Private key: $PrivateKeyPath"

  if (!(Test-Path -LiteralPath $PrivateKeyPath)) {
    throw "Private key not found: $PrivateKeyPath"
  }

  Write-Step "Step 2/7 - Update application version"

  Set-JsonVersion `
    -Path $packageJsonPath `
    -NextVersion $Version

  Set-JsonVersion `
    -Path $tauriConfigPath `
    -NextVersion $Version

  Set-CargoVersion `
    -Path $cargoTomlPath `
    -NextVersion $Version

  Write-Host "Version updated to $Version" -ForegroundColor Green

  Write-Step "Step 3/7 - Synchronize dependencies"

  $pnpmPath = Join-Path `
    $env:APPDATA `
    "npm\pnpm.cmd"

  if (Test-Path -LiteralPath $pnpmPath) {
    & $pnpmPath install

    if ($LASTEXITCODE -ne 0) {
      throw "pnpm install failed"
    }
  }
  else {
    & npm install

    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed"
    }
  }

  Write-Step "Step 4/7 - Configure signing key"

  $env:TAURI_SIGNING_PRIVATE_KEY =
    $PrivateKeyPath

  if (
    [string]::IsNullOrWhiteSpace(
      $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD
    )
  ) {
    $credential = Get-Credential `
      -UserName "ValuePlus Updater" `
      -Message "Enter the private key password for version $Version"

    if ($null -eq $credential) {
      throw "Password prompt was cancelled"
    }

    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD =
      $credential.GetNetworkCredential().Password
  }

  Write-Step "Step 5/7 - Build signed Tauri installer"

  Push-Location $projectRoot

  try {
    & npm run tauri -- build

    if ($LASTEXITCODE -ne 0) {
      throw "Tauri build failed"
    }
  }
  finally {
    Pop-Location
  }

  if (!(Test-Path -LiteralPath $sourceExe)) {
    throw "Installer not found: $sourceExe"
  }

  if (!(Test-Path -LiteralPath $sourceSig)) {
    throw "Signature not found: $sourceSig"
  }

  Write-Step "Step 6/7 - Prepare release files"

  New-Item `
    -ItemType Directory `
    -Path $releaseFolder `
    -Force |
    Out-Null

  Copy-Item `
    -LiteralPath $sourceExe `
    -Destination $releaseExe `
    -Force

  Copy-Item `
    -LiteralPath $sourceSig `
    -Destination $releaseSig `
    -Force

  $signature = (
    Get-Content `
      -LiteralPath $releaseSig `
      -Raw
  ).Trim()

  $downloadUrl =
    "https://github.com/$GitHubOwner/$ReleaseRepository/releases/download/v$Version/$releaseExeName"

  $latest = [ordered]@{
    version = $Version
    notes = $Notes
    pub_date = (
      Get-Date
    ).ToUniversalTime().ToString(
      "yyyy-MM-ddTHH:mm:ssZ"
    )
    platforms = [ordered]@{
      "windows-x86_64" = [ordered]@{
        signature = $signature
        url = $downloadUrl
      }
    }
  }

  $latestJson = $latest |
    ConvertTo-Json -Depth 10

  Write-Utf8File `
    -Path $latestJsonPath `
    -Content $latestJson

  Write-Step "Step 7/7 - Verify release output"

  $requiredFiles = @(
    $releaseExe,
    $releaseSig,
    $latestJsonPath
  )

  foreach ($file in $requiredFiles) {
    if (!(Test-Path -LiteralPath $file)) {
      throw "Required release file not found: $file"
    }
  }

  Get-ChildItem `
    -LiteralPath $releaseFolder `
    -File |
    Select-Object Name, Length |
    Format-Table -AutoSize

  $releaseCompleted = $true

  Write-Host ""
  Write-Host "Release build completed successfully." -ForegroundColor Green
  Write-Host "Version: $Version"
  Write-Host "Tag: v$Version"
  Write-Host "Folder: $releaseFolder"

  Write-Host ""
  Write-Host "Upload all files from this folder to GitHub Release:" -ForegroundColor Yellow
  Write-Host $releaseFolder
}
catch {
  Write-Host ""
  Write-Host "Release failed." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red

  Write-Host ""
  Write-Host "Restoring previous version files..." -ForegroundColor Yellow

  Write-Utf8File `
    -Path $packageJsonPath `
    -Content $packageBackup

  Write-Utf8File `
    -Path $tauriConfigPath `
    -Content $tauriBackup

  Write-Utf8File `
    -Path $cargoTomlPath `
    -Content $cargoBackup

  throw
}
finally {
  Remove-Item `
    Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD `
    -ErrorAction SilentlyContinue

  Remove-Item `
    Env:TAURI_SIGNING_PRIVATE_KEY `
    -ErrorAction SilentlyContinue
}