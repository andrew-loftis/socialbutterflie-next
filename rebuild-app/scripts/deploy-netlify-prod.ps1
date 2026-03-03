Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Deploy the rebuild-app to Netlify.
#
# IMPORTANT: Do NOT use `netlify deploy --prod --build` alone — that flag
# combination silently omits the serverless function upload, resulting in 404s.
# Instead, we build first, then deploy with explicit --functions pointing to
# .netlify/functions-internal so the ___netlify-server-handler function
# (which serves ALL Next.js routes) is uploaded.

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Resolve-Path (Join-Path $here "..")

Push-Location $appDir
try {
  Write-Host "=== Building ===" -ForegroundColor Cyan
  npx netlify-cli build

  Write-Host "`n=== Deploying to production ===" -ForegroundColor Cyan
  npx netlify-cli deploy --prod --no-build --dir=".next" --functions=".netlify/functions-internal"

  Write-Host "`nDeploy complete!" -ForegroundColor Green
} finally {
  Pop-Location
}

