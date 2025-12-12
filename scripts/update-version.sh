#!/bin/bash

# バージョン番号を一括更新するスクリプト
# 使用方法: ./scripts/update-version.sh 1.11.0

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_DIR"

if [ -z "$1" ]; then
    echo "❌ エラー: バージョン番号を指定してください"
    echo "使用方法: $0 <version>"
    echo "例: $0 1.11.0"
    exit 1
fi

NEW_VERSION="$1"

# バージョン形式の検証（例: 1.10.0, 2.0.0）
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ エラー: 無効なバージョン形式です"
    echo "正しい形式: X.Y.Z (例: 1.10.0, 2.0.0)"
    exit 1
fi

echo "🔄 バージョンを更新中..."
echo "   新しいバージョン: ${NEW_VERSION}"
echo ""

# 現在のバージョンを取得
CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
echo "   現在のバージョン: ${CURRENT_VERSION}"
echo ""

# package.jsonを更新
if [ -f "package.json" ]; then
    # macOSとLinuxの両方で動作するsedコマンド
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" package.json
    else
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" package.json
    fi
    echo "✅ package.json を更新しました"
fi

# tauri.conf.jsonを更新
if [ -f "src-tauri/tauri.conf.json" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" src-tauri/tauri.conf.json
    else
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" src-tauri/tauri.conf.json
    fi
    echo "✅ src-tauri/tauri.conf.json を更新しました"
fi

# Cargo.tomlを更新
if [ -f "src-tauri/Cargo.toml" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version = \"[^\"]*\"/version = \"${NEW_VERSION}\"/" src-tauri/Cargo.toml
    else
        sed -i "s/^version = \"[^\"]*\"/version = \"${NEW_VERSION}\"/" src-tauri/Cargo.toml
    fi
    echo "✅ src-tauri/Cargo.toml を更新しました"
fi

echo ""
echo "✨ バージョン更新が完了しました！"
echo ""
echo "📋 更新されたファイル:"
echo "   - package.json"
echo "   - src-tauri/tauri.conf.json"
echo "   - src-tauri/Cargo.toml"
echo ""
echo "💡 次のステップ:"
echo "   1. 変更内容を確認: git diff"
echo "   2. ビルドを実行: npm run package:mac"
echo "   3. リリースノートを更新: RELEASE_NOTES.md"
