param([string]$BaseUrl = "http://localhost:8080")

# Authentication-aware smoke test. Uses synthetic accounts on a local server only.
& node (Join-Path $PSScriptRoot "auth-smoke-test.mjs") $BaseUrl
if ($LASTEXITCODE -ne 0) { throw "Authentication smoke test failed" }
