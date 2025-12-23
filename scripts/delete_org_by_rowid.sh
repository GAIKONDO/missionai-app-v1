#!/bin/bash
# _rowid_で組織を削除するスクリプト
# 使用方法: ./delete_org_by_rowid.sh <_rowid_>
# 例: ./delete_org_by_rowid.sh 2

if [ -z "$1" ]; then
    echo "使用方法: $0 <_rowid_>"
    echo "例: $0 2"
    exit 1
fi

ROWID="$1"
DB_PATH="$HOME/Library/Application Support/com.missionai.app/mission-ai-local-dev/mission_ai.db"

if [ ! -f "$DB_PATH" ]; then
    echo "エラー: データベースファイルが見つかりません: $DB_PATH"
    exit 1
fi

echo "=========================================="
echo "_rowid_ = $ROWID の組織を削除します"
echo "=========================================="
echo ""

# まず、該当する組織のIDを取得
ORG_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM organizations WHERE _rowid_ = $ROWID;")

if [ -z "$ORG_ID" ]; then
    echo "❌ エラー: _rowid_ = $ROWID の組織が見つかりません"
    exit 1
fi

echo "組織ID: $ORG_ID"
echo ""

# 参照を確認
echo "参照を確認中..."
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
EOF

echo ""
echo "=========================================="
echo "強制削除を実行します"
echo "=========================================="
echo ""

# 外部キー制約を無効化して削除
sqlite3 "$DB_PATH" <<EOF
BEGIN TRANSACTION;

-- 外部キー制約を無効化
PRAGMA foreign_keys = OFF;

-- この組織を親として参照している他の組織のparentIdをNULLに設定
UPDATE organizations SET parentId = NULL WHERE parentId = '$ORG_ID';

-- 組織を削除
DELETE FROM organizations WHERE _rowid_ = $ROWID;

-- 外部キー制約を再有効化
PRAGMA foreign_keys = ON;

COMMIT;

SELECT '削除完了' as status, changes() as deleted_rows;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 削除が完了しました"
else
    echo ""
    echo "❌ 削除に失敗しました"
    exit 1
fi








