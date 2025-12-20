# Windowsデプロイ用パッケージ作成ガイド

> **📋 ステータス**: アクティブ（Windowsデプロイガイド）  
> **📅 作成日**: 2025-01-XX  
> **👤 用途**: Windows環境でのビルド・デプロイ用パッケージ作成手順

## 概要

このガイドでは、macOSで開発したMissionAIアプリケーションをWindows環境でビルド・デプロイするために、必要なファイルをZIP化する手順を説明します。

**重要**: Windowsデプロイは**Windows環境で実行する必要があります**。そのため、Windowsでビルドできるように必要なファイルのみをZIP化してWindows環境に転送します。

---

## 前提条件

### macOS環境（ZIP作成時）

- macOS開発環境
- zipコマンド（標準で利用可能）

### Windows環境（ビルド時）

- **Node.js** (v20以上推奨)
- **Rust** (最新のstable版)
- **Visual Studio Build Tools** または **Visual Studio Community**
  - C++ ビルドツール
  - Windows SDK
- **Tauri CLI**: `npm install -g @tauri-apps/cli`

---

## ZIP化手順

### ステップ1: ビルド成果物のクリーンアップ

ビルド成果物や一時ファイルを削除して、クリーンな状態にします：

```bash
# プロジェクトルートで実行
cd /Users/gaikondo/Desktop/test-app/app40_MissionAI

# ビルド成果物の削除
rm -rf node_modules
rm -rf .next
rm -rf out
rm -rf src-tauri/target
rm -rf src-tauri/Cargo.lock  # Windowsで再生成されるため

# Mac固有ファイルの削除
find . -name ".DS_Store" -delete
find . -name "._*" -delete
```

### ステップ2: 含めるファイル・ディレクトリの確認

以下のファイル・ディレクトリをZIPに含めます：

#### ✅ 含めるもの

**ソースコード**
- `app/` - Next.jsアプリケーションディレクトリ
- `components/` - Reactコンポーネント
- `lib/` - ライブラリコード
- `types/` - TypeScript型定義
- `scripts/` - ビルドスクリプト

**設定ファイル**
- `package.json` - Node.js依存関係
- `package-lock.json` - 依存関係のロックファイル
- `tsconfig.json` - TypeScript設定
- `next.config.js` - Next.js設定
- `.gitignore` - Git除外設定

**Tauri関連**
- `src-tauri/` - Tauriソースコード（`target/`と`Cargo.lock`を除く）
  - `src/` - Rustソースコード
  - `icons/` - アプリケーションアイコン
  - `resources/` - リソースファイル（plantuml.jarなど）
  - `tauri.conf.json` - Tauri設定
  - `tauri.conf.dev.json` - Tauri開発設定
  - `Cargo.toml` - Rust依存関係
  - `build.rs` - ビルドスクリプト

**ドキュメント**
- `docs/` - ドキュメント（オプション、必要に応じて）
- `README_INSTALL.md` - インストールガイド
- `DISTRIBUTION_README.md` - 配布用README

**その他**
- `.gitignore` - Git除外設定

#### ❌ 含めないもの

**ビルド成果物**
- `node_modules/` - Windowsで`npm install`で再生成
- `.next/` - Windowsで`npm run build`で再生成
- `out/` - Windowsで`npm run build`で再生成
- `src-tauri/target/` - Windowsで`cargo build`で再生成
- `src-tauri/Cargo.lock` - Windowsで`cargo build`で再生成

**Mac固有ファイル**
- `.DS_Store` - Mac固有のメタデータ
- `._*` - Mac固有のリソースフォーク
- `build-mac.command` - Mac専用ビルドスクリプト
- `install-dependencies-auto.command` - Mac専用スクリプト
- `start-dev.command` - Mac専用スクリプト

**その他**
- `.vscode/` - IDE設定（個人設定）
- `.idea/` - IDE設定（個人設定）
- `*.log` - ログファイル
- `.env*.local` - ローカル環境変数

### ステップ3: ZIPファイルの作成

以下のコマンドでZIPファイルを作成します：

```bash
# プロジェクトルートで実行
cd /Users/gaikondo/Desktop/test-app/app40_MissionAI

# ZIPファイル名（バージョンを含める）
ZIP_NAME="MissionAI-Windows-Deploy-v2.1.2-$(date +%Y%m%d).zip"

# ZIPファイルの作成（除外パターンを指定）
zip -r "$ZIP_NAME" \
  app/ \
  components/ \
  lib/ \
  types/ \
  scripts/ \
  data/ \
  package.json \
  package-lock.json \
  tsconfig.json \
  next.config.js \
  .gitignore \
  src-tauri/src/ \
  src-tauri/icons/ \
  src-tauri/resources/ \
  src-tauri/tauri.conf.json \
  src-tauri/tauri.conf.dev.json \
  src-tauri/Cargo.toml \
  src-tauri/build.rs \
  docs/ \
  README_INSTALL.md \
  DISTRIBUTION_README.md \
  -x "*.DS_Store" \
  -x "*._*" \
  -x "node_modules/*" \
  -x ".next/*" \
  -x "out/*" \
  -x "src-tauri/target/*" \
  -x "src-tauri/Cargo.lock" \
  -x ".vscode/*" \
  -x ".idea/*" \
  -x "*.log" \
  -x ".env*.local" \
  -x "build-mac.command" \
  -x "install-dependencies-auto.command" \
  -x "start-dev.command"

echo "ZIPファイルが作成されました: $ZIP_NAME"
```

### ステップ4: ZIPファイルの確認

ZIPファイルの内容を確認します：

```bash
# ZIPファイルの内容を確認
unzip -l "$ZIP_NAME" | head -50

# ZIPファイルのサイズを確認
ls -lh "$ZIP_NAME"
```

**期待されるサイズ**: 約10-50MB（ソースコードとリソースファイルのみのため）

---

## Windows環境でのビルド手順

### ステップ1: ZIPファイルの展開

Windows環境でZIPファイルを展開します：

```powershell
# PowerShellで実行
# ZIPファイルを適切な場所に展開
Expand-Archive -Path "MissionAI-Windows-Deploy-v2.1.2-YYYYMMDD.zip" -DestinationPath "C:\Projects\MissionAI"
cd C:\Projects\MissionAI
```

### ステップ2: 必要なツールのインストール確認

```powershell
# Node.jsのバージョン確認
node --version  # v20以上推奨

# npmのバージョン確認
npm --version

# Rustのバージョン確認
rustc --version

# Cargoのバージョン確認
cargo --version

# Tauri CLIのインストール確認
tauri --version
```

**Tauri CLIがインストールされていない場合**:

```powershell
npm install -g @tauri-apps/cli
```

### ステップ3: 依存関係のインストール

```powershell
# Node.js依存関係のインストール
npm install

# これにより以下が生成されます:
# - node_modules/
# - package-lock.json（更新される可能性あり）
```

### ステップ4: 環境変数の設定（必要に応じて）

```powershell
# 環境変数の設定
$env:API_SERVER_PORT="3011"
$env:CHROMADB_PORT="8000"
```

### ステップ5: Next.jsのビルド

```powershell
# Next.jsアプリケーションのビルド
npm run build

# これにより以下が生成されます:
# - .next/
# - out/
```

### ステップ6: Tauriアプリのビルド

```powershell
# Tauriアプリケーションのビルド
npm run tauri:build

# これにより以下が生成されます:
# - src-tauri/target/release/
# - src-tauri/target/release/bundle/msi/
```

### ステップ7: ビルド成果物の確認

```powershell
# Windows用パッケージの確認
dir src-tauri\target\release\bundle\msi\

# 期待される出力:
# - MissionAI_2.1.2_x64_en-US.msi (Windowsインストーラー)
# - MissionAI_2.1.2_x64-setup.exe (セットアップ実行ファイル、場合によって)
```

---

## トラブルシューティング

### ZIPファイルが大きすぎる

**原因**: ビルド成果物が含まれている

**解決方法**:
1. ビルド成果物を削除してからZIP化
2. `.gitignore`で除外されているファイルを確認

### Windowsでビルドが失敗する

**原因1**: Visual Studio Build Toolsがインストールされていない

**解決方法**:
1. Visual Studio Build Toolsをインストール
2. C++ ビルドツールとWindows SDKを選択

**原因2**: Rustツールチェーンが正しく設定されていない

**解決方法**:
```powershell
rustup update
rustup default stable
```

**原因3**: 環境変数が設定されていない

**解決方法**:
```powershell
$env:API_SERVER_PORT="3011"
$env:CHROMADB_PORT="8000"
```

### 依存関係のインストールが失敗する

**原因**: package-lock.jsonが古い、または破損している

**解決方法**:
```powershell
# package-lock.jsonを削除して再生成
Remove-Item package-lock.json
npm install
```

---

## 自動化スクリプト（オプション）

ZIP作成を自動化するスクリプトを作成できます：

### `create-windows-deploy-package.sh`

```bash
#!/bin/bash

# Windowsデプロイ用パッケージ作成スクリプト

set -e

PROJECT_ROOT="/Users/gaikondo/Desktop/test-app/app40_MissionAI"
cd "$PROJECT_ROOT"

# バージョン情報の取得
VERSION=$(node -p "require('./package.json').version")
DATE=$(date +%Y%m%d)
ZIP_NAME="MissionAI-Windows-Deploy-v${VERSION}-${DATE}.zip"

echo "=========================================="
echo "Windowsデプロイ用パッケージ作成"
echo "=========================================="
echo "バージョン: $VERSION"
echo "日付: $DATE"
echo "ZIPファイル名: $ZIP_NAME"
echo ""

# クリーンアップ
echo "1. ビルド成果物のクリーンアップ..."
rm -rf node_modules .next out src-tauri/target src-tauri/Cargo.lock
find . -name ".DS_Store" -delete
find . -name "._*" -delete
echo "✓ クリーンアップ完了"
echo ""

# ZIPファイルの作成
echo "2. ZIPファイルの作成..."
zip -r "$ZIP_NAME" \
  app/ \
  components/ \
  lib/ \
  types/ \
  scripts/ \
  data/ \
  package.json \
  package-lock.json \
  tsconfig.json \
  next.config.js \
  .gitignore \
  src-tauri/src/ \
  src-tauri/icons/ \
  src-tauri/resources/ \
  src-tauri/tauri.conf.json \
  src-tauri/tauri.conf.dev.json \
  src-tauri/Cargo.toml \
  src-tauri/build.rs \
  docs/ \
  README_INSTALL.md \
  DISTRIBUTION_README.md \
  -x "*.DS_Store" \
  -x "*._*" \
  -x "node_modules/*" \
  -x ".next/*" \
  -x "out/*" \
  -x "src-tauri/target/*" \
  -x "src-tauri/Cargo.lock" \
  -x ".vscode/*" \
  -x ".idea/*" \
  -x "*.log" \
  -x ".env*.local" \
  -x "build-mac.command" \
  -x "install-dependencies-auto.command" \
  -x "start-dev.command" \
  > /dev/null

echo "✓ ZIPファイル作成完了"
echo ""

# ファイルサイズの確認
SIZE=$(ls -lh "$ZIP_NAME" | awk '{print $5}')
echo "3. ファイル情報:"
echo "   ファイル名: $ZIP_NAME"
echo "   サイズ: $SIZE"
echo ""

# ZIPファイルの内容確認（最初の20行）
echo "4. ZIPファイルの内容（最初の20エントリ）:"
unzip -l "$ZIP_NAME" | head -25
echo ""

echo "=========================================="
echo "✓ パッケージ作成完了"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. ZIPファイルをWindows環境に転送"
echo "2. Windows環境でZIPファイルを展開"
echo "3. npm install を実行"
echo "4. npm run build を実行"
echo "5. npm run tauri:build を実行"
echo ""
```

**使用方法**:

```bash
chmod +x create-windows-deploy-package.sh
./create-windows-deploy-package.sh
```

---

## チェックリスト

### ZIP作成前

- [ ] すべての変更がコミットされている
- [ ] バージョン番号が正しく更新されている
- [ ] ビルド成果物が削除されている
- [ ] Mac固有ファイルが削除されている

### ZIP作成後

- [ ] ZIPファイルのサイズが適切（10-50MB程度）
- [ ] ZIPファイルの内容が正しい（必要なファイルが含まれている）
- [ ] ZIPファイルが破損していない（展開テスト）

### Windowsビルド前

- [ ] Node.jsがインストールされている
- [ ] Rustがインストールされている
- [ ] Visual Studio Build Toolsがインストールされている
- [ ] Tauri CLIがインストールされている

### Windowsビルド後

- [ ] MSIインストーラーが生成されている
- [ ] アプリケーションが正常に起動する
- [ ] 主要機能が正常に動作する

---

## 関連ドキュメント

- [ビルド・デプロイガイド](./BUILD_AND_DEPLOYMENT.md)
- [開発ガイドライン](../development/DEVELOPMENT_GUIDELINES.md)
- [環境変数](../environment/ENVIRONMENT_VARIABLES.md)
- [Rust/Tauri設定](../rust/RUST_TAURI_CONFIGURATION.md)

---

最終更新: 2025-01-XX
