param(
    [Parameter(Mandatory = $true)]
    [string]$Domain
)

$ErrorActionPreference = "Stop"
$outputPath = Join-Path $PSScriptRoot ".env.production"

function New-RandomSecret([int]$bytes = 48) {
    $buffer = [byte[]]::new($bytes)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
    return [Convert]::ToBase64String($buffer)
}

$geminiSecure = Read-Host "Gemini API 키 (화면에 표시되지 않음)" -AsSecureString
$geminiPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($geminiSecure)
try {
    $geminiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($geminiPointer)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($geminiPointer)
}

$content = @"
APP_DOMAIN=$Domain
MYSQL_PASSWORD=$(New-RandomSecret 32)
MYSQL_ROOT_PASSWORD=$(New-RandomSecret 32)
JWT_SECRET=$(New-RandomSecret 48)

ADMIN_SEED_ENABLED=false
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_DISPLAY_NAME=관리자

LLM_ENABLED=true
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_API_KEY=$geminiKey
LLM_MODEL=gemini-2.5-flash
"@

[IO.File]::WriteAllText($outputPath, $content, [Text.UTF8Encoding]::new($false))
Write-Host "생성 완료: $outputPath"
Write-Host "이 파일은 .gitignore 대상이며 Git에 추가하면 안 됩니다."
