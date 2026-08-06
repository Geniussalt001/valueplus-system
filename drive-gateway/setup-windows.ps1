$ErrorActionPreference = "Stop"

Write-Host "ValuePlus Drive Gateway setup" -ForegroundColor Cyan

if (-not (Test-Path "wrangler.toml")) {
  Copy-Item "wrangler.toml.example" "wrangler.toml"
  Write-Host "Created wrangler.toml. Check DRIVE_ROOT_FOLDER_ID before deploy." -ForegroundColor Yellow
}

npm.cmd install
npx.cmd wrangler login

Write-Host "Enter each secret only in Wrangler's secure prompt." -ForegroundColor Yellow
npx.cmd wrangler secret put DRIVE_GATEWAY_SIGNING_SECRET
npx.cmd wrangler secret put GOOGLE_CLIENT_ID
npx.cmd wrangler secret put GOOGLE_CLIENT_SECRET
npx.cmd wrangler secret put GOOGLE_REFRESH_TOKEN

Write-Host "Deploying Gateway..." -ForegroundColor Cyan
npm.cmd run deploy

Write-Host "Copy the workers.dev URL shown above into the root .env.local file." -ForegroundColor Green
