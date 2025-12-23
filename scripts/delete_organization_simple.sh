#!/bin/bash
# 組織を直接SQLiteで削除するための簡単なスクリプト
# 使用方法: ./delete_organization_simple.sh <組織ID>

if [ -z "$1" ]; then
    echo "使用方法: $0 <組織ID>"
    echo "例: $0 1"
    exit 1
fi

ORG_ID="$1"
DB_PATH="$HOME/Library/Application Support/com.missionai.app/mission-ai-local-dev/mission_ai.db"

if [ ! -f "$DB_PATH" ]; then
    echo "エラー: データベースファイルが見つかりません: $DB_PATH"
    exit 1
fi

echo "組織ID '$ORG_ID' を削除します..."
echo "データベース: $DB_PATH"
echo ""

# 外部キー制約を無効化して削除
sqlite3 "$DB_PATH" <<EOF
PRAGMA foreign_keys = OFF;
DELETE FROM organizations WHERE id = '$ORG_ID';
PRAGMA foreign_keys = ON;
SELECT changes();
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 削除が完了しました"
else
    echo ""
    echo "❌ 削除に失敗しました"
    exit 1
fi








