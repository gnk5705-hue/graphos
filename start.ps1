# GraphOS 실행 스크립트
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "GraphOS를 시작합니다..." -ForegroundColor Cyan

# 백엔드 시작
Write-Host "백엔드 서버 시작 중 (포트 8000)..." -ForegroundColor Yellow
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python -m uvicorn app.main:app --reload --port 8000" -PassThru

Start-Sleep -Seconds 2

# 프론트엔드 시작
Write-Host "프론트엔드 개발 서버 시작 중 (포트 5173)..." -ForegroundColor Yellow
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -PassThru

Write-Host ""
Write-Host "GraphOS 실행 완료!" -ForegroundColor Green
Write-Host "  앱:     http://localhost:5173" -ForegroundColor White
Write-Host "  API:    http://localhost:8000" -ForegroundColor White
Write-Host "  API 문서: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host ".env 파일에 OpenAI API 키를 설정했는지 확인하세요." -ForegroundColor Magenta
Write-Host ""
Write-Host "Phase 3 기능:" -ForegroundColor DarkCyan
Write-Host "  - 상단 ★ Agent 버튼으로 AI 에이전트 생성" -ForegroundColor Gray
Write-Host "  - 그래프에서 에이전트 노드 클릭 시 전용 채팅 패널 오픈" -ForegroundColor Gray
Write-Host "  - 노드 선택 후 NodeDetail > Actions 탭에서 문서/코드 생성" -ForegroundColor Gray
Write-Host "  - 상단 ⚙ 버튼으로 GitHub/Notion 연동 설정 확인" -ForegroundColor Gray
