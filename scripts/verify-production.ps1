# Quick production smoke test (API + optional frontend URL)
param(
    [string]$ApiBase = "https://ayahfind.com",
    [switch]$ViaProxy,
    [string]$FrontendUrl = ""
)

if ($ViaProxy) {
    $ApiBase = "https://ayahfind.com"
}

$healthUrl = "$ApiBase/api/v1/health"
Write-Host "GET $healthUrl"
try {
    $health = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 120
    $health | ConvertTo-Json -Depth 5
    if ($health.status -ne "ok" -or $health.ayah_count -lt 1) {
        Write-Host "FAIL: API degraded or empty corpus" -ForegroundColor Red
        exit 1
    }
    if ($health.upstream -match "trycloudflare|cloudflare\.com") {
        Write-Host "FAIL: still using Cloudflare tunnel: $($health.upstream)" -ForegroundColor Red
        exit 1
    }
    if ($health.repo_root -match "\\Users\\") {
        Write-Host "FAIL: backend is still your PC (repo_root=$($health.repo_root))" -ForegroundColor Red
        exit 1
    }
    if ($health.retrieval_version) {
        Write-Host "retrieval_version=$($health.retrieval_version) build_id=$($health.build_id)"
    } else {
        Write-Host "WARN: retrieval_version missing — deploy may be stale" -ForegroundColor Yellow
    }
    Write-Host "OK: API healthy ($($health.ayah_count) ayahs)" -ForegroundColor Green
} catch {
    Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$searchUrl = "$ApiBase/api/v1/search/unified"
$body = @{ query = "qul huwa allahu ahad"; top_k = 3 } | ConvertTo-Json
Write-Host "POST $searchUrl"
try {
    $search = Invoke-RestMethod -Uri $searchUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 120
    $n = @($search.results).Count
    if ($n -lt 1) {
        Write-Host "FAIL: search returned no results" -ForegroundColor Red
        exit 1
    }
    $top = $search.results[0]
    Write-Host "OK: search returned $n result(s); top $($top.surah):$($top.ayah) conf=$($top.confidence)" -ForegroundColor Green
} catch {
    Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Arabic voice-style query (56:75, plural مواقع vs Uthmani موقع)
$arabicBody = '{"query":"\u0641\u0644\u0627 \u0627\u0642\u0633\u0645 \u0628\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u0646\u062c\u0648\u0645","top_k":5}'
Write-Host "POST $searchUrl (arabic 56:75)"
try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $ar = Invoke-RestMethod -Uri $searchUrl -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($arabicBody)) -ContentType "application/json; charset=utf-8" -TimeoutSec 120
    $sw.Stop()
    if (@($ar.results).Count -lt 1) {
        Write-Host "FAIL: arabic 56:75 query returned no results (${sw.ElapsedMilliseconds}ms)" -ForegroundColor Red
        exit 1
    }
    $t = $ar.results[0]
    if ($t.surah -ne 56 -or $t.ayah -ne 75) {
        Write-Host "FAIL: expected 56:75 got $($t.surah):$($t.ayah)" -ForegroundColor Red
        exit 1
    }
    if ($sw.ElapsedMilliseconds -gt 3000) {
        Write-Host "WARN: arabic search slow (${sw.ElapsedMilliseconds}ms)" -ForegroundColor Yellow
    }
    Write-Host "OK: arabic 56:75 in ${sw.ElapsedMilliseconds}ms conf=$($t.confidence)" -ForegroundColor Green
} catch {
    Write-Host "FAIL: arabic search $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$debugUrl = "$ApiBase/api/v1/debug-search"
Write-Host "GET $debugUrl"
try {
    $dbg = Invoke-RestMethod -Uri $debugUrl -TimeoutSec 120
    if ($dbg.lexical_trace) {
        $dbg.lexical_trace | ConvertTo-Json -Compress
    }
    if ($dbg.timings_ms) {
        Write-Host "debug timings_ms: $($dbg.timings_ms | ConvertTo-Json -Compress)"
    }
} catch {
    Write-Host "WARN: debug-search $($_.Exception.Message)" -ForegroundColor Yellow
}

if ($FrontendUrl) {
    Write-Host "Frontend: $FrontendUrl (manual: confirm search uses $ApiBase)"
}

exit 0