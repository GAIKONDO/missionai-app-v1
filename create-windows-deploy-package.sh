#!/bin/bash

# Windowsデプロイ用パッケージ作成スクリプト
# 使用方法: ./create-windows-deploy-package.sh

set -e

# プロジェクトルートの取得（スクリプトの場所から）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
cd "$PROJECT_ROOT"

# バージョン情報の取得
if [ -f "package.json" ]; then
    VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
else
    VERSION="unknown"
fi

DATE=$(date +%Y%m%d)
ZIP_NAME="MissionAI-Windows-Deploy-v${VERSION}-${DATE}.zip"

echo "=========================================="
echo "Windowsデプロイ用パッケージ作成"
echo "=========================================="
echo "プロジェクトルート: $PROJECT_ROOT"
echo "バージョン: $VERSION"
echo "日付: $DATE"
echo "ZIPファイル名: $ZIP_NAME"
echo ""

# クリーンアップ
echo "1. ビルド成果物のクリーンアップ..."
if [ -d "node_modules" ]; then
    echo "   - node_modules/ を削除中..."
    rm -rf node_modules
fi
if [ -d ".next" ]; then
    echo "   - .next/ を削除中..."
    rm -rf .next
fi
if [ -d "out" ]; then
    echo "   - out/ を削除中..."
    rm -rf out
fi
if [ -d "src-tauri/target" ]; then
    echo "   - src-tauri/target/ を削除中..."
    rm -rf src-tauri/target
fi
if [ -f "src-tauri/Cargo.lock" ]; then
    echo "   - src-tauri/Cargo.lock を削除中..."
    rm -f src-tauri/Cargo.lock
fi

# Mac固有ファイルの削除
echo "   - Mac固有ファイルを削除中..."
find . -name ".DS_Store" -delete 2>/dev/null || true
find . -name "._*" -delete 2>/dev/null || true

echo "✓ クリーンアップ完了"
echo ""

# ZIPファイルの作成
echo "2. ZIPファイルの作成..."
echo "   これには数分かかる場合があります..."

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
  -x "create-windows-deploy-package.sh" \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ ZIPファイル作成完了"
else
    echo "✗ ZIPファイル作成に失敗しました"
    exit 1
fi
echo ""

# ファイルサイズの確認
if [ -f "$ZIP_NAME" ]; then
    SIZE=$(ls -lh "$ZIP_NAME" | awk '{print $5}')
    echo "3. ファイル情報:"
    echo "   ファイル名: $ZIP_NAME"
    echo "   サイズ: $SIZE"
    echo "   場所: $PROJECT_ROOT/$ZIP_NAME"
    echo ""

    # ZIPファイルの内容確認（最初の25行）
    echo "4. ZIPファイルの内容（最初の25エントリ）:"
    unzip -l "$ZIP_NAME" 2>/dev/null | head -28
    echo ""
    echo "   ... (残りは省略)"
    echo ""
else
    echo "✗ ZIPファイルが見つかりません"
    exit 1
fi

echo "=========================================="
echo "✓ パッケージ作成完了"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. ZIPファイルをWindows環境に転送"
echo "   - ファイル: $ZIP_NAME"
echo ""
echo "2. Windows環境でZIPファイルを展開"
echo "   PowerShell: Expand-Archive -Path \"$ZIP_NAME\" -DestinationPath \"C:\\Projects\\MissionAI\""
echo ""
echo "3. Windows環境で依存関係をインストール"
echo "   PowerShell: cd C:\\Projects\\MissionAI && npm install"
echo ""
echo "4. Windows環境でNext.jsをビルド"
echo "   PowerShell: npm run build"
echo ""
echo "5. Windows環境でTauriアプリをビルド"
echo "   PowerShell: npm run tauri:build"
echo ""
echo "詳細は docs/deployment/WINDOWS_DEPLOYMENT_PACKAGE_GUIDE.md を参照してください"
echo ""
