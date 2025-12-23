-- 組織を強制削除するスクリプト（外部キー制約を無視）
-- 使用方法: sqlite3 mission_ai.db < force_delete_organization.sql
-- 注意: このスクリプトは参照整合性を無視するため、慎重に使用してください

-- 削除したい組織ID（実際の値に置き換えてください）
-- 例: '1'

BEGIN TRANSACTION;

-- 外部キー制約を無効化
PRAGMA foreign_keys = OFF;

-- 削除対象の組織IDを設定（実際の値に置き換えてください）
-- 例: DELETE FROM organizations WHERE id = '1';
DELETE FROM organizations WHERE id = '1';

-- 外部キー制約を再有効化
PRAGMA foreign_keys = ON;

COMMIT;

-- 削除結果を確認
SELECT changes() as deleted_rows;








