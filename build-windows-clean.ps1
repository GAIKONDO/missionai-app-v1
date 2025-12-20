# Windows環境でのクリーンビルドスクリプト
# 使用方法: .\build-windows-clean.ps1

param(
    [string]$ProjectPath = "."
)

Set-Location $ProjectPath

Write-Host "=========================================="
Write-Host "Windows環境でのクリーンビルド"
Write-Host "=========================================="
Write-Host "プロジェクトパス: $(Get-Location)"
Write-Host ""

# ステップ1: 古いビルド成果物の削除
Write-Host "1. 古いビルド成果物の削除中..."
if (Test-Path "out") {
    Remove-Item -Path "out" -Recurse -Force
    Write-Host "   - out/ を削除しました"
}
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
    Write-Host "   - .next/ を削除しました"
}
if (Test-Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force
    Write-Host "   - node_modules/ を削除しました"
}
if (Test-Path "src-tauri\target") {
    Remove-Item -Path "src-tauri\target" -Recurse -Force
    Write-Host "   - src-tauri\target/ を削除しました"
}
if (Test-Path "src-tauri\Cargo.lock") {
    Remove-Item -Path "src-tauri\Cargo.lock" -Force
    Write-Host "   - src-tauri\Cargo.lock を削除しました"
}
Write-Host "✓ クリーンアップ完了"
Write-Host ""

# ステップ2: 依存関係のインストール
Write-Host "2. 依存関係のインストール中..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 依存関係のインストールに失敗しました"
    exit 1
}
Write-Host "✓ 依存関係のインストール完了"
Write-Host ""

# ステップ3: 環境変数の設定
Write-Host "3. 環境変数の設定..."
$env:API_SERVER_PORT="3011"
$env:CHROMADB_PORT="8000"
Write-Host "   - API_SERVER_PORT=3011"
Write-Host "   - CHROMADB_PORT=8000"
Write-Host "✓ 環境変数の設定完了"
Write-Host ""

# ステップ4: Next.jsのビルド
Write-Host "4. Next.jsのビルド中..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Next.jsビルドに失敗しました"
    exit 1
}
if (-not (Test-Path "out\index.html")) {
    Write-Host "✗ out\index.htmlが見つかりません"
    exit 1
}
Write-Host "✓ Next.jsビルド完了"
Write-Host ""

# ステップ5: Tauriアプリのビルド
Write-Host "5. Tauriアプリのビルド中..."
Write-Host "   これには数分かかる場合があります..."
npm run tauri:build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Tauriビルドに失敗しました"
    exit 1
}
$msiFiles = Get-ChildItem -Path "src-tauri\target\release\bundle\msi\*.msi" -ErrorAction SilentlyContinue
if (-not $msiFiles) {
    Write-Host "✗ MSIファイルが見つかりません"
    exit 1
}
Write-Host "✓ Tauriビルド完了"
Write-Host ""

# ステップ6: ビルド結果の表示
Write-Host "=========================================="
Write-Host "✓ ビルド完了"
Write-Host "=========================================="
Write-Host ""
Write-Host "ビルド成果物:"
$msiFiles | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  - $($_.Name)"
    Write-Host "    サイズ: $sizeMB MB"
    Write-Host "    更新日時: $($_.LastWriteTime)"
}
Write-Host ""
Write-Host "場所: src-tauri\target\release\bundle\msi\"
Write-Host ""
