# 초친 포럼 - 테스트 사이트 원클릭 배포 스크립트 (PowerShell)
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  초친 포럼 테스트 사이트 원클릭 자동 배포 시작" -ForegroundColor Cyan
Write-Host "  대상 저장소: imBBBT/test (main 브랜치)" -ForegroundColor DarkGray
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] 변경된 파일 확인 및 스테이징 중..." -ForegroundColor Yellow
git add .

git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[2/3] 자동 커밋 생성 중 ($now)..." -ForegroundColor Yellow
    git commit -m "테스트 배포: $now"
} else {
    Write-Host "[2/3] 새로 변경된 파일이 없습니다. (기존 커밋으로 푸시 진행)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "[3/3] imBBBT/test 로 푸시 중..." -ForegroundColor Yellow
git push test HEAD:main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host "  [배포 성공!] 테스트 저장소에 업로드되었습니다." -ForegroundColor Green
    Write-Host ""
    Write-Host "  테스트 사이트 주소:" -ForegroundColor White
    Write-Host "  https://imBBBT.github.io/test/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ※ GitHub Pages 최초 1회 활성화 확인:" -ForegroundColor DarkGray
    Write-Host "  https://github.com/imBBBT/test/settings/pages" -ForegroundColor DarkGray
    Write-Host "  Branch: 'main' / Folder: '/ (root)' -> Save" -ForegroundColor DarkGray
    Write-Host "===================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Red
    Write-Host "  [배포 실패] 푸시 중 오류가 발생했습니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "  확인 사항:" -ForegroundColor Yellow
    Write-Host "  1. GitHub에 'imBBBT/test' 리포지토리가 생성되어 있는지 확인하세요." -ForegroundColor White
    Write-Host "  2. 계정 푸시 권한을 확인하세요." -ForegroundColor White
    Write-Host "===================================================" -ForegroundColor Red
}

Write-Host ""
Write-Host "아무 키나 누르면 창이 닫힙니다..." -ForegroundColor DarkGray
try {
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} catch {
    pause
}
