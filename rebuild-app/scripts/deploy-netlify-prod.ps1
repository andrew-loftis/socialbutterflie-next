Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Run from repo root or from rebuild-app/. Always deploy the generated Netlify Next.js artifacts.
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Resolve-Path (Join-Path $here "..")

Push-Location $appDir
try {
  netlify build
  netlify deploy --no-build --prod --dir .netlify/static --functions .netlify/functions-internal
} finally {
  Pop-Location
}

