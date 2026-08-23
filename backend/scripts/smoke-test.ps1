param([string]$BaseUrl = "http://localhost:8080")

$clientId = "smoke_test_client_01"
$profile = @{
    name = "지윤"
    age = 26
    employment = "첫 취업 · 정규직"
    monthlyIncome = 2450000
    housingType = "월세"
    deposit = 10000000
    monthlyRent = 650000
    maintenance = 80000
    utilities = "확인하지 못함"
    insurance = $null
    debtPayment = 140000
    cardPayment = 720000
    emergencyFund = 700000
    familySupport = 200000
    familySupportEnds = $true
    moveDate = $null
} | ConvertTo-Json

$health = Invoke-RestMethod "$BaseUrl/api/health"
$saved = Invoke-RestMethod "$BaseUrl/api/profiles/$clientId" -Method Put -ContentType "application/json; charset=utf-8" -Body $profile
$diagnosis = Invoke-RestMethod "$BaseUrl/api/diagnoses/$clientId"
$chat = Invoke-RestMethod "$BaseUrl/api/chat" -Method Post -ContentType "application/json; charset=utf-8" -Body (@{
    clientId = $clientId
    message = "지금 독립 가능할까?"
} | ConvertTo-Json)

if ($health.status -ne "UP") { throw "Health check failed" }
if ($diagnosis.monthlyInflow -ne 2450000) { throw "Diagnosis inflow mismatch" }
if ($diagnosis.confirmedRequiredExpenses -ne 1590000) { throw "Diagnosis expense mismatch" }
if ([string]::IsNullOrWhiteSpace($chat.answer)) { throw "Chat answer is empty" }

Write-Host "FINDEPENDENCE API smoke test passed"
Write-Host "Saved profile:" $saved.clientId
Write-Host "Expected balance:" $diagnosis.expectedBalance
Write-Host "Chat:" $chat.answer
