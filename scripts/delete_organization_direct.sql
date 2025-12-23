-- 組織を直接SQLiteで削除するためのスクリプト
-- 使用方法: sqlite3 mission_ai.db < delete_organization_direct.sql
-- または: sqlite3 mission_ai.db
--        .read delete_organization_direct.sql
--        DELETE FROM organizations WHERE id = '1';

-- 方法1: 外部キー制約を一時的に無効化して削除
-- 注意: この方法は参照整合性を無視するため、慎重に使用してください

-- 外部キー制約を無効化
PRAGMA foreign_keys = OFF;

-- 削除したい組織のIDを指定（例: '1'）
-- DELETE FROM organizations WHERE id = '1';

-- 外部キー制約を再有効化
PRAGMA foreign_keys = ON;

-- ============================================
-- 方法2: 参照データを先に削除/更新してから削除（推奨）
-- ============================================

-- 削除したい組織のIDを変数として設定（実際の値に置き換えてください）
-- 例: .param set :org_id '1'

-- 1. この組織を親として参照している他の組織のparentIdをNULLに設定
-- UPDATE organizations SET parentId = NULL WHERE parentId = :org_id;

-- 2. 組織メンバーを削除
-- DELETE FROM organizationMembers WHERE organizationId = :org_id;

-- 3. 組織コンテンツを削除
-- DELETE FROM organizationContents WHERE organizationId = :org_id;

-- 4. 注力施策を削除
-- DELETE FROM focusInitiatives WHERE organizationId = :org_id;

-- 5. 議事録を削除
-- DELETE FROM meetingNotes WHERE organizationId = :org_id;

-- 6. エンティティを削除
-- DELETE FROM entities WHERE organizationId = :org_id;

-- 7. リレーションを削除
-- DELETE FROM relations WHERE organizationId = :org_id;

-- 8. トピックを削除
-- DELETE FROM topics WHERE organizationId = :org_id;

-- 9. 事業会社を削除
-- DELETE FROM companies WHERE organizationId = :org_id;

-- 10. organizationCompanyDisplayはON DELETE CASCADEなので自動削除される

-- 11. 最後に組織を削除
-- DELETE FROM organizations WHERE id = :org_id;

-- ============================================
-- 方法3: 一括削除スクリプト（組織IDを指定）
-- ============================================

-- 以下のスクリプトをコピーして、:org_id を実際の組織IDに置き換えて実行してください

/*
BEGIN TRANSACTION;

-- 変数を設定（実際の組織IDに置き換えてください）
-- .param set :org_id '1'

-- 子組織のparentIdをNULLに設定
UPDATE organizations SET parentId = NULL WHERE parentId = :org_id;

-- 関連データを削除
DELETE FROM organizationMembers WHERE organizationId = :org_id;
DELETE FROM organizationContents WHERE organizationId = :org_id;
DELETE FROM focusInitiatives WHERE organizationId = :org_id;
DELETE FROM meetingNotes WHERE organizationId = :org_id;
DELETE FROM entities WHERE organizationId = :org_id;
DELETE FROM relations WHERE organizationId = :org_id;
DELETE FROM topics WHERE organizationId = :org_id;
DELETE FROM companies WHERE organizationId = :org_id;

-- 組織を削除
DELETE FROM organizations WHERE id = :org_id;

COMMIT;
*/








