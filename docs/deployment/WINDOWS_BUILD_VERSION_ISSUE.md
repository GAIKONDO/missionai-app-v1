# Windowsビルドで古いバージョンになる問題の解決ガイド

> **📋 ステータス**: アクティブ（トラブルシューティングガイド）  
> **📅 作成日**: 2025-01-XX  
> **👤 用途**: Windows環境でビルドしたアプリが古いバージョンになる問題の解決

## 問題の概要

Windows環境でビルドしたアプリが古いバージョンになっている場合、以下のいずれかが原因です：

1. **古いZIPファイルを使用している** - Macで作成したZIPファイルが古い
2. **古いビルド成果物が残っている** - Windows環境に古い`out`ディレクトリや`target`ディレクトリが残っている
3. **最新のソースコードが含まれていない** - ZIPファイルに最新の変更が含まれていない

## 確認事項

### ✅ WindowsでビルドしてもMacと同じ最新機能になる

**はい、正しい理解です。**

Windows環境でビルドする際は、**最新のソースコードからビルド**するため、Macと同じ最新の機能が含まれます。

**重要なポイント**:
- Windowsでビルドする際は、**最新のソースコード**を含むZIPファイルを使用する必要があります
- Windows環境で`npm run build`と`npm run tauri:build`を実行すると、**その時点のソースコードから**最新のアプリが生成されます
- 古いビルド成果物（`out/`、`target/`）が残っていると、古いバージョンが使われる可能性があります

---

## 解決手順

### ステップ1: Macで最新のZIPファイルを作成

**重要**: 最新の変更をコミット・保存してからZIPファイルを作成してください。

```bash
# Mac環境で実行
cd /Users/gaikondo/Desktop/test-app/app40_MissionAI

# 最新のZIPファイルを作成
./create-windows-deploy-package.sh
```

**確認事項**:
- ZIPファイル名に日付が含まれているか確認
- 最新の変更が含まれているか確認（必要に応じてZIPファイルの内容を確認）

### ステップ2: Windows環境で古いビルド成果物を削除

**重要**: Windows環境でビルドする前に、古いビルド成果物を削除してください。

```powershell
# PowerShellで実行
cd C:\Projects\MissionAI  # プロジェクトのパスに置き換え

# 古いビルド成果物を削除
Remove-Item -Path "out" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src-tauri\target" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src-tauri\Cargo.lock" -Force -ErrorAction SilentlyContinue

Write-Host "古いビルド成果物を削除しました"
```

### ステップ3: 最新のZIPファイルを展開

```powershell
# 古いプロジェクトディレクトリを削除（必要に応じて）
Remove-Item -Path "C:\Projects\MissionAI" -Recurse -Force -ErrorAction SilentlyContinue

# 最新のZIPファイルを展開
Expand-Archive -Path "MissionAI-Windows-Deploy-v2.1.2-YYYYMMDD.zip" -DestinationPath "C:\Projects\MissionAI"

cd C:\Projects\MissionAI
```

### ステップ4: 依存関係のインストール

```powershell
# 依存関係をインストール
npm install
```

### ステップ5: クリーンビルドの実行

```powershell
# 環境変数の設定（必要に応じて）
$env:API_SERVER_PORT="3011"
$env:CHROMADB_PORT="8000"

# Next.jsのビルド（最新のソースコードから）
npm run build

# ビルド結果の確認
if (Test-Path "out\index.html") {
    Write-Host "✓ Next.jsビルド成功"
} else {
    Write-Host "✗ Next.jsビルド失敗"
    exit 1
}
```

### ステップ6: Tauriアプリのビルド

```powershell
# Tauriアプリのビルド（最新のソースコードから）
npm run tauri:build

# ビルド結果の確認
if (Test-Path "src-tauri\target\release\bundle\msi\*.msi") {
    Write-Host "✓ Tauriビルド成功"
    Get-ChildItem -Path "src-tauri\target\release\bundle\msi\*.msi" | Select-Object Name, LastWriteTime
} else {
    Write-Host "✗ Tauriビルド失敗"
    exit 1
}
```

---

## 自動化スクリプト

Windows環境でクリーンビルドを自動化するスクリプトを作成できます：

### `build-windows-clean.ps1`

```powershell
# Windows環境でのクリーンビルドスクリプト
# 使用方法: .\build-windows-clean.ps1

param(
    [string]$ProjectPath = "C:\Projects\MissionAI"
)

Set-Location $ProjectPath

Write-Host "=========================================="
Write-Host "Windows環境でのクリーンビルド"
Write-Host "=========================================="
Write-Host ""

# ステップ1: 古いビルド成果物の削除
Write-Host "1. 古いビルド成果物の削除中..."
Remove-Item -Path "out" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src-tauri\target" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src-tauri\Cargo.lock" -Force -ErrorAction SilentlyContinue
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
if (-not (Test-Path "src-tauri\target\release\bundle\msi\*.msi")) {
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
Get-ChildItem -Path "src-tauri\target\release\bundle\msi\*.msi" | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length / 1MB, 2)}}, LastWriteTime
Write-Host ""
```

**使用方法**:

```powershell
# スクリプトを保存して実行
.\build-windows-clean.ps1

# または、プロジェクトパスを指定
.\build-windows-clean.ps1 -ProjectPath "C:\Projects\MissionAI"
```

---

## バージョン確認方法

### ビルド前の確認（Mac環境）

```bash
# package.jsonのバージョンを確認
cat package.json | grep '"version"'

# 最新の変更が含まれているか確認
git status
git log --oneline -5  # 最新の5つのコミットを表示
```

### ビルド後の確認（Windows環境）

```powershell
# package.jsonのバージョンを確認
Get-Content package.json | Select-String '"version"'

# ビルド日時を確認
Get-ChildItem -Path "src-tauri\target\release\bundle\msi\*.msi" | Select-Object Name, LastWriteTime

# outディレクトリの更新日時を確認
Get-ChildItem -Path "out" -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

---

## よくある問題と解決方法

### 問題1: ZIPファイルが古い

**症状**: Windowsでビルドしても古い機能が表示される

**原因**: Macで作成したZIPファイルが古い

**解決方法**:
1. Macで最新のZIPファイルを作成
2. Windows環境で古いZIPファイルを削除
3. 最新のZIPファイルを展開してビルド

### 問題2: 古いビルド成果物が残っている

**症状**: ビルドしても古いバージョンが使われる

**原因**: Windows環境に古い`out`ディレクトリや`target`ディレクトリが残っている

**解決方法**:
```powershell
# すべてのビルド成果物を削除
Remove-Item -Path "out" -Recurse -Force
Remove-Item -Path ".next" -Recurse -Force
Remove-Item -Path "src-tauri\target" -Recurse -Force
Remove-Item -Path "src-tauri\Cargo.lock" -Force

# クリーンビルドを実行
npm install
npm run build
npm run tauri:build
```

### 問題3: ソースコードが最新でない

**症状**: ZIPファイルに最新の変更が含まれていない

**原因**: MacでZIPファイルを作成する前に、最新の変更を保存していない

**解決方法**:
1. Macで最新の変更をコミット・保存
2. 最新のZIPファイルを作成
3. Windows環境で最新のZIPファイルを使用

### 問題4: キャッシュの問題

**症状**: ビルドしても変更が反映されない

**原因**: npmやCargoのキャッシュが古い

**解決方法**:
```powershell
# npmキャッシュのクリア
npm cache clean --force

# Cargoキャッシュのクリア（必要に応じて）
# cargo clean  # src-tauriディレクトリで実行

# クリーンビルド
Remove-Item -Path "node_modules" -Recurse -Force
npm install
npm run build
npm run tauri:build
```

---

## チェックリスト

### Mac環境（ZIPファイル作成前）

- [ ] 最新の変更がコミット・保存されている
- [ ] バージョン番号が正しく更新されている
- [ ] 最新のZIPファイルを作成した
- [ ] ZIPファイル名に日付が含まれている

### Windows環境（ビルド前）

- [ ] 最新のZIPファイルを使用している
- [ ] 古いビルド成果物（`out/`, `.next/`, `target/`）を削除した
- [ ] 最新のZIPファイルを展開した
- [ ] 依存関係をインストールした

### Windows環境（ビルド後）

- [ ] `out`ディレクトリが最新の日時で生成されている
- [ ] MSIファイルが最新の日時で生成されている
- [ ] アプリを起動して最新の機能が表示されることを確認

---

## まとめ

### 重要なポイント

1. **WindowsでビルドしてもMacと同じ最新機能になる**
   - Windows環境で最新のソースコードからビルドするため

2. **最新のZIPファイルを使用する**
   - Macで最新の変更を保存してからZIPファイルを作成

3. **古いビルド成果物を削除する**
   - Windows環境でビルドする前に、古い`out/`や`target/`を削除

4. **クリーンビルドを実行する**
   - `npm install` → `npm run build` → `npm run tauri:build`

### 推奨ワークフロー

1. **Mac環境**:
   ```bash
   # 最新の変更を保存
   git add .
   git commit -m "Latest changes"
   
   # 最新のZIPファイルを作成
   ./create-windows-deploy-package.sh
   ```

2. **Windows環境**:
   ```powershell
   # 古いビルド成果物を削除
   Remove-Item -Path "out", ".next", "src-tauri\target" -Recurse -Force -ErrorAction SilentlyContinue
   
   # 最新のZIPファイルを展開
   Expand-Archive -Path "MissionAI-Windows-Deploy-v2.1.2-YYYYMMDD.zip" -DestinationPath "C:\Projects\MissionAI"
   
   # クリーンビルド
   cd C:\Projects\MissionAI
   npm install
   npm run build
   npm run tauri:build
   ```

---

## 関連ドキュメント

- [Windowsデプロイ用パッケージ作成ガイド](./WINDOWS_DEPLOYMENT_PACKAGE_GUIDE.md)
- [静的ファイル保存ガイド](./STATIC_FILES_GUIDE.md)
- [ビルド・デプロイガイド](./BUILD_AND_DEPLOYMENT.md)

---

最終更新: 2025-01-XX
