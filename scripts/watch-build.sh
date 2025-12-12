#!/bin/bash

# ビルドの進捗を監視するスクリプト
# 使用方法: ./scripts/watch-build.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
LOG_FILE="/tmp/missionai-build.log"

echo "📊 ビルド進捗監視を開始します..."
echo "   ログファイル: $LOG_FILE"
echo "   Ctrl+Cで終了します"
echo ""

if [ ! -f "$LOG_FILE" ]; then
    echo "⚠️  ログファイルが見つかりません。ビルドを開始してください。"
    echo "   コマンド: npm run package:mac"
    exit 1
fi

# ログファイルを監視
tail -f "$LOG_FILE" 2>/dev/null || {
    echo "📋 ログファイルの内容を表示します:"
    echo ""
    tail -100 "$LOG_FILE"
}
