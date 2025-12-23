-- 組織ID '1' を参照しているデータを確認するスクリプト
-- 使用方法: sqlite3 mission_ai.db < check_organization_references.sql
-- または: sqlite3 mission_ai.db
--        .read check_organization_references.sql

-- 削除したい組織IDを設定（実際の値に置き換えてください）
-- .param set :org_id '1'

-- 1. organizationsテーブル内で、この組織を親として参照している組織を確認
SELECT 'organizations (parentId)' as table_name, COUNT(*) as count 
FROM organizations 
WHERE parentId = '1';

SELECT id, name, parentId 
FROM organizations 
WHERE parentId = '1';

-- 2. 各テーブルで参照されているか確認
SELECT 'organizationMembers' as table_name, COUNT(*) as count 
FROM organizationMembers 
WHERE organizationId = '1';

SELECT 'organizationContents' as table_name, COUNT(*) as count 
FROM organizationContents 
WHERE organizationId = '1';

SELECT 'focusInitiatives' as table_name, COUNT(*) as count 
FROM focusInitiatives 
WHERE organizationId = '1';

SELECT 'meetingNotes' as table_name, COUNT(*) as count 
FROM meetingNotes 
WHERE organizationId = '1';

SELECT 'entities' as table_name, COUNT(*) as count 
FROM entities 
WHERE organizationId = '1';

SELECT 'relations' as table_name, COUNT(*) as count 
FROM relations 
WHERE organizationId = '1';

SELECT 'topics' as table_name, COUNT(*) as count 
FROM topics 
WHERE organizationId = '1';

SELECT 'companies' as table_name, COUNT(*) as count 
FROM companies 
WHERE organizationId = '1';

SELECT 'organizationCompanyDisplay' as table_name, COUNT(*) as count 
FROM organizationCompanyDisplay 
WHERE organizationId = '1';

-- 3. 外部キー制約の状態を確認
PRAGMA foreign_keys;

-- 4. 削除対象の組織が存在するか確認
SELECT id, name, parentId 
FROM organizations 
WHERE id = '1';








