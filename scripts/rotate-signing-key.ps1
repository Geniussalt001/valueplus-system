param(
  [string]$ProjectPath = "D:\valueplus-system"
)

$ErrorActionPreference = "Stop"

function Convert-SecureStringToText {
  param(
    [Security.SecureString]$Value
  )

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

if (-not (Test-Path -LiteralPath $ProjectPath -PathType Container)) {
  throw "Project folder not found: $ProjectPath"
}

$tauriConfig = Join-Path $ProjectPath "src-tauri\tauri.conf.json"

if (-not (Test-Path -LiteralPath $tauriConfig -PathType Leaf)) {
  throw "Tauri configuration was not found: $tauriConfig"
}

$keyFolder = Join-Path $env:USERPROFILE ".tauri"
$keyPath = Join-Path $keyFolder "valueplus-system.key"
$publicKeyPath = "$keyPath.pub"

if (
  (Test-Path -LiteralPath $keyPath -PathType Leaf) -or
  (Test-Path -LiteralPath $publicKeyPath -PathType Leaf)
) {
  throw "A signing key already exists at $keyPath. Move it to a secure backup before rotating again."
}

$firstPassword = Read-Host "Create a password for the new signing key" -AsSecureString
$secondPassword = Read-Host "Enter the same password again" -AsSecureString
$password = Convert-SecureStringToText $firstPassword
$passwordConfirmation = Convert-SecureStringToText $secondPassword

if ([string]::IsNullOrWhiteSpace($password)) {
  throw "The signing key password must not be empty."
}

if ($password -ne $passwordConfirmation) {
  throw "The signing key passwords do not match."
}

$pnpm = Join-Path $env:APPDATA "npm\pnpm.cmd"

if (-not (Test-Path -LiteralPath $pnpm -PathType Leaf)) {
  $pnpmCommand = Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue

  if ($null -eq $pnpmCommand) {
    throw "pnpm.cmd was not found."
  }

  $pnpm = $pnpmCommand.Source
}

New-Item -ItemType Directory -Path $keyFolder -Force | Out-Null

Write-Host "Generating a new Tauri updater keypair..." -ForegroundColor Cyan

Push-Location $ProjectPath

try {
  & $pnpm tauri signer generate `
    --write-keys $keyPath `
    --password $password `
    --ci

  if ($LASTEXITCODE -ne 0) {
    throw "Tauri signer failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

if (
  -not (Test-Path -LiteralPath $keyPath -PathType Leaf) -or
  -not (Test-Path -LiteralPath $publicKeyPath -PathType Leaf)
) {
  throw "Tauri did not create the expected key files."
}

$publicKey = (
  Get-Content -LiteralPath $publicKeyPath -Raw -Encoding utf8
).Trim()

if ([string]::IsNullOrWhiteSpace($publicKey)) {
  throw "The generated public key is empty."
}

$configText = Get-Content -LiteralPath $tauriConfig -Raw -Encoding utf8
$pubkeyPattern = '(?m)("pubkey"\s*:\s*")[^"]*(")'

if (-not [regex]::IsMatch($configText, $pubkeyPattern)) {
  throw "plugins.updater.pubkey was not found in tauri.conf.json"
}

$updatedConfig = [regex]::Replace(
  $configText,
  $pubkeyPattern,
  "`${1}$publicKey`${2}"
)

[IO.File]::WriteAllText(
  $tauriConfig,
  $updatedConfig,
  [Text.UTF8Encoding]::new($false)
)

Write-Host "Public key updated in tauri.conf.json." -ForegroundColor Green

$ghCommand = Get-Command "gh.exe" -ErrorAction SilentlyContinue

if ($null -eq $ghCommand) {
  Write-Host "GitHub CLI was not found." -ForegroundColor Yellow
  Write-Host "Install it with: winget install --id GitHub.cli --exact" -ForegroundColor Yellow
  Write-Host "Then set the three repository secrets before publishing." -ForegroundColor Yellow
} else {
  & $ghCommand.Source auth status 2>$null

  if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub CLI is not logged in. Run: gh auth login" -ForegroundColor Yellow
  } else {
    Write-Host "Uploading signing secrets to the private source repository..." -ForegroundColor Cyan

    Get-Content -LiteralPath $keyPath -Raw -Encoding utf8 |
      & $ghCommand.Source secret set `
        TAURI_SIGNING_PRIVATE_KEY `
        --repo Geniussalt001/valueplus-system

    $password |
      & $ghCommand.Source secret set `
        TAURI_SIGNING_PRIVATE_KEY_PASSWORD `
        --repo Geniussalt001/valueplus-system

    $releaseToken = & $ghCommand.Source auth token

    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($releaseToken)) {
      $releaseToken |
        & $ghCommand.Source secret set `
          RELEASE_TOKEN `
          --repo Geniussalt001/valueplus-system

      Write-Host "All updater secrets were configured." -ForegroundColor Green
    } else {
      Write-Host "Unable to read the GitHub CLI token. Set RELEASE_TOKEN manually." -ForegroundColor Yellow
    }
  }
}

$password = $null
$passwordConfirmation = $null

Write-Host "New private key: $keyPath" -ForegroundColor Cyan
Write-Host "New public key: $publicKeyPath" -ForegroundColor Cyan
Write-Host "BACK UP BOTH FILES AND THE PASSWORD. Never commit the private key." -ForegroundColor Red
Write-Host "Commit tauri.conf.json and updater workflow, then publish version 1.0.3." -ForegroundColor Yellow
