#!/bin/bash
# 組織の参照を確認してから削除するスクリプト
# 使用方法: ./check_and_delete_organization.sh <組織ID>

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

echo "=========================================="
echo "組織ID '$ORG_ID' の参照を確認します"
echo "=========================================="
echo ""

# 参照を確認
sqlite3 "$DB_PATH" <<EOF
.mode column
.headers on

SELECT 'organizations (parentId)' as table_name, COUNT(*) as count 
FROM organizations 
WHERE parentId = '$ORG_ID';

SELECT 'organizationMembers' as table_name, COUNT(*) as count 
FROM organizationMembers 
WHERE organizationId = '$ORG_ID';

SELECT 'organizationContents' as table_name, COUNT(*) as count 
FROM organizationContents 
WHERE organizationId = '$ORG_ID';

SELECT 'focusInitiatives' as table_name, COUNT(*) as count 
FROM focusInitiatives 
WHERE organizationId = '$ORG_ID';

SELECT 'meetingNotes' as table_name, COUNT(*) as count 
FROM meetingNotes 
WHERE organizationId = '$ORG_ID';

SELECT 'entities' as table_name, COUNT(*) as count 
FROM entities 
WHERE organizationId = '$ORG_ID';

SELECT 'relations' as table_name, COUNT(*) as count 
FROM relations 
WHERE organizationId = '$ORG_ID';

SELECT 'topics' as table_name, COUNT(*) as count 
FROM topics 
WHERE organizationId = '$ORG_ID';

SELECT 'companies' as table_name, COUNT(*) as count 
FROM companies 
WHERE organizationId = '$ORG_ID';

SELECT 'organizationCompanyDisplay' as table_name, COUNT(*) as count 
FROM organizationCompanyDisplay 
WHERE organizationId = '$ORG_ID';

SELECT '外部キー制約の状態' as info, foreign_keys as status FROM pragma_foreign_keys();
EOF

echo ""
echo "=========================================="
echo "強制削除を実行しますか？ (y/N)"
echo "=========================================="
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "削除を実行します..."
    
    sqlite3 "$DB_PATH" <<EOF
BEGIN TRANSACTION;

PRAGMA foreign_keys = OFF;

DELETE FROM organizations WHERE id = '$ORG_ID';

PRAGMA foreign_keys = ON;

COMMIT;

SELECT '削除された行数' as info, changes() as count;
EOF
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 削除が完了しました"
    else
        echo ""
        echo "❌ 削除に失敗しました"
        exit 1
    fi
else
    echo "削除をキャンセルしました"
fi








