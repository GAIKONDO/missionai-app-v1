mod auth;
mod store;
mod ai_settings;
mod backup;
mod export;
mod container;
mod organization;
mod companies;
mod organization_company_display;
mod vector_search;
mod design_doc;
mod themes;
pub mod chromadb;
pub mod pool;

use rusqlite::{Result as SqlResult, params};
use r2d2::PooledConnection;
use r2d2_sqlite::SqliteConnectionManager;
pub use pool::DatabasePool;
use tauri::{AppHandle, Manager};
use std::path::PathBuf;
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use bcrypt::{hash, DEFAULT_COST};

// ログ出力マクロ（リリースビルドでは最小限）
macro_rules! init_log {
    ($($arg:tt)*) => {
        #[cfg(debug_assertions)]
        eprintln!($($arg)*);
    };
}

macro_rules! init_log_always {
    ($($arg:tt)*) => {
        eprintln!($($arg)*);
    };
}

pub use auth::{sign_up, sign_in, sign_out};
pub use store::{get_doc, set_doc, update_doc, delete_doc, add_doc, get_collection, delete_meeting_note_with_relations};
pub use ai_settings::{get_ai_setting, set_ai_setting, get_default_model};
pub use backup::{create_backup as db_create_backup, restore_backup as db_restore_backup, list_backups as db_list_backups, cleanup_old_backups, delete_backup as db_delete_backup};
pub use export::{
    export_to_file, import_from_file, export_table, export_all_data, import_template_data_if_empty,
    export_selected_tables, export_organizations_and_members,
    export_selected_tables_to_file, export_organizations_and_members_to_file
};
pub use container::{
    add_container, get_container, get_containers_by_page, get_containers_by_plan,
    update_container, delete_container, get_container_as_map,
};
pub use organization::{
    create_organization, update_organization, update_organization_parent_id, get_organization_by_id,
    search_organizations_by_name, get_organizations_by_parent_id, get_organization_tree, delete_organization,
    add_member, add_member_simple, update_member, get_member_by_id, get_members_by_organization_id, delete_member,
    get_all_organizations, get_all_members,
    export_organizations_and_members_to_csv,
    check_duplicate_organizations, delete_duplicate_organizations,
    DuplicateOrgInfo, OrgDetailInfo,
    Organization, OrganizationMember, OrganizationWithMembers,
    OrganizationMaster,
    import_organization_master_from_csv,
    get_organization_master_by_code,
    get_organization_masters_by_parent_code,
    build_organization_tree_from_master,
    import_members_from_csv,
    get_organization_code_by_name,
};
pub use companies::{
    create_company, update_company, get_company_by_id, get_company_by_code,
    get_companies_by_organization_id, get_all_companies, delete_company,
    export_companies_to_csv,
    Company,
};
pub use organization_company_display::{
    create_organization_company_display, get_companies_by_organization_display,
    get_organizations_by_company_display, get_all_organization_company_displays,
    update_organization_company_display_order, delete_organization_company_display,
    delete_organization_company_display_by_ids,
    delete_all_organization_company_displays_by_organization,
    delete_all_organization_company_displays_by_company,
    OrganizationCompanyDisplay,
};
pub use design_doc::{
    create_design_doc_section, update_design_doc_section, get_design_doc_section_by_id,
    get_all_design_doc_sections, get_all_design_doc_sections_lightweight, delete_design_doc_section,
    create_design_doc_section_relation, update_design_doc_section_relation,
    get_design_doc_section_relation_by_id, get_design_doc_section_relations_by_section_id,
    get_all_design_doc_section_relations, delete_design_doc_section_relation,
    DesignDocSection, DesignDocSectionRelation,
};
pub use themes::{
    get_all_themes, get_theme_by_id, save_theme, create_theme, delete_theme,
    Theme,
};

pub struct Database {
    pool: DatabasePool,
}

impl Database {
    pub fn get_pool(&self) -> DatabasePool {
        self.pool.clone()
    }
}

static mut DB: Option<Database> = None;
static mut CURRENT_USER: Option<User> = None;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub uid: String,
    pub email: String,
    pub email_verified: bool,
}

impl Database {
    pub fn new(path: PathBuf) -> SqlResult<Self> {
        let pool = DatabasePool::new(path)
            .map_err(|e| rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some(format!("Failed to create database pool: {}", e))
            ))?;
        
        Ok(Database { pool })
    }

    /// プールからコネクションを取得
    pub fn get_connection(&self) -> Result<PooledConnection<SqliteConnectionManager>, rusqlite::Error> {
        self.pool.get_connection()
            .map_err(|e| rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some(format!("Failed to get connection from pool: {}", e))
            ))
    }

    /// 不要なテーブルを削除（既にChromaDBに移行済みの埋め込みテーブル）
    pub fn drop_unused_tables(&self) -> SqlResult<()> {
        let conn = self.get_connection()?;
        
        // 外部キー制約を一時的に無効化
        conn.execute("PRAGMA foreign_keys = OFF", [])?;
        
        // 埋め込みテーブルを削除（既にChromaDBに移行済み）
        let tables_to_drop = vec![
            "entityEmbeddings",
            "topicEmbeddings",
            "relationEmbeddings",
        ];
        
        for table_name in tables_to_drop {
            // テーブルが存在するか確認
            let table_exists: bool = conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name = ?1",
                params![table_name],
                |row| Ok(row.get::<_, i32>(0)? > 0),
            ).unwrap_or(false);
            
            if table_exists {
                init_log!("🗑️  不要なテーブルを削除: {}", table_name);
                if let Err(e) = conn.execute(&format!("DROP TABLE IF EXISTS {}", table_name), []) {
                    init_log!("⚠️  テーブル削除エラー: {} - {}", table_name, e);
                } else {
                    init_log!("✅ テーブル削除成功: {}", table_name);
                }
            }
        }
        
        // 外部キー制約を再度有効化
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        
        Ok(())
    }

    pub fn init_tables(&self) -> SqlResult<()> {
        let conn = self.get_connection()?;
        
        // ユーザーテーブル
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                passwordHash TEXT NOT NULL,
                approved INTEGER DEFAULT 0,
                approvedBy TEXT,
                approvedAt TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )",
            [],
        )?;

        // ページコンテナテーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS pageContainers (
                id TEXT PRIMARY KEY,
                pageId TEXT NOT NULL,
                planId TEXT NOT NULL,
                planType TEXT NOT NULL,
                containerType TEXT NOT NULL,
                containerData TEXT NOT NULL,
                position INTEGER DEFAULT 0,
                userId TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id)
            )",
            [],
        )?;

        // 管理者テーブル
        conn.execute(
            "CREATE TABLE IF NOT EXISTS admins (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                createdAt TEXT NOT NULL
            )",
            [],
        )?;

        // 承認リクエストテーブル
        conn.execute(
            "CREATE TABLE IF NOT EXISTS approvalRequests (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                email TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                requestedAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id)
            )",
            [],
        )?;

        // AI設定テーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS aiSettings (
                id TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                apiKey TEXT,
                baseUrl TEXT,
                defaultModel TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )",
            [],
        )?;

        // バックアップ履歴テーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS backupHistory (
                id TEXT PRIMARY KEY,
                backupPath TEXT NOT NULL,
                backupSize INTEGER,
                createdAt TEXT NOT NULL
            )",
            [],
        )?;

        // 組織テーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS organizations (
                id TEXT PRIMARY KEY,
                parentId TEXT,
                name TEXT NOT NULL,
                title TEXT,
                description TEXT,
                level INTEGER NOT NULL,
                levelName TEXT NOT NULL,
                position INTEGER DEFAULT 0,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (parentId) REFERENCES organizations(id)
            )",
            [],
        )?;

        // 組織メンバーテーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS organizationMembers (
                id TEXT PRIMARY KEY,
                organizationId TEXT NOT NULL,
                name TEXT NOT NULL,
                position TEXT,
                nameRomaji TEXT,
                department TEXT,
                extension TEXT,
                companyPhone TEXT,
                mobilePhone TEXT,
                email TEXT,
                itochuEmail TEXT,
                teams TEXT,
                employeeType TEXT,
                roleName TEXT,
                indicator TEXT,
                location TEXT,
                floorDoorNo TEXT,
                previousName TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (organizationId) REFERENCES organizations(id)
            )",
            [],
        )?;

        // 既存のorganizationMembersテーブルに不足しているカラムを追加（マイグレーション）
        // SQLiteではALTER TABLE ADD COLUMN IF NOT EXISTSは使えないため、エラーハンドリングで対応
        let columns_to_add = vec![
            ("nameRomaji", "TEXT"),
            ("department", "TEXT"),
            ("extension", "TEXT"),
            ("companyPhone", "TEXT"),
            ("mobilePhone", "TEXT"),
            ("email", "TEXT"),
            ("itochuEmail", "TEXT"),
            ("teams", "TEXT"),
            ("employeeType", "TEXT"),
            ("roleName", "TEXT"),
            ("indicator", "TEXT"),
            ("location", "TEXT"),
            ("floorDoorNo", "TEXT"),
            ("previousName", "TEXT"),
        ];

        for (column_name, column_type) in columns_to_add {
            // カラムが存在するかチェック
            let column_exists: bool = conn.query_row(
                "SELECT COUNT(*) FROM pragma_table_info('organizationMembers') WHERE name = ?1",
                params![column_name],
                |row| Ok(row.get::<_, i32>(0)? > 0),
            ).unwrap_or(false);

            if !column_exists {
                init_log!("📝 organizationMembersテーブルにカラムを追加: {}", column_name);
                if let Err(e) = conn.execute(
                    &format!("ALTER TABLE organizationMembers ADD COLUMN {} {}", column_name, column_type),
                    [],
                ) {
                    init_log!("⚠️  カラム追加エラー（既に存在する可能性があります）: {} - {}", column_name, e);
                }
            }
        }

        // 組織コンテンツテーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS organizationContents (
                id TEXT PRIMARY KEY,
                organizationId TEXT NOT NULL,
                introduction TEXT,
                focusAreas TEXT,
                meetingNotes TEXT,
                createdAt TEXT,
                updatedAt TEXT,
                FOREIGN KEY (organizationId) REFERENCES organizations(id)
            )",
            [],
        )?;

        // 組織マスターテーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS organization_master (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                parent_code TEXT,
                hierarchy_level INTEGER NOT NULL,
                hierarchy_type TEXT NOT NULL,
                name_kanji TEXT NOT NULL,
                name_kanji_short TEXT,
                name_english TEXT,
                company_code TEXT,
                company_name TEXT,
                division_code TEXT,
                division_name TEXT,
                department_code TEXT,
                department_name TEXT,
                section_code TEXT,
                section_name TEXT,
                department_indicator TEXT,
                section_indicator TEXT,
                section_indicator_short TEXT,
                phone TEXT,
                fax TEXT,
                accounting_team_code TEXT,
                accounting_team_name TEXT,
                accounting_team_phone TEXT,
                accounting_team_fax TEXT,
                sales_section_type TEXT,
                domestic_overseas_type TEXT,
                consolidated_sales_section_type TEXT,
                weighted_average_domestic TEXT,
                weighted_average_import TEXT,
                weighted_average_export TEXT,
                weighted_average_three_countries TEXT,
                store_code TEXT,
                store_name TEXT,
                overseas_office_code TEXT,
                common_log_section_code TEXT,
                report_distribution_destination_1 TEXT,
                report_distribution_destination_2 TEXT,
                billing_not_required TEXT,
                purchase_billing_not_required TEXT,
                account_total_display TEXT,
                is_active INTEGER DEFAULT 1,
                valid_from_date TEXT,
                valid_to_date TEXT,
                is_abolished INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (parent_code) REFERENCES organization_master(code)
            )",
            [],
        )?;

        // 組織マスターテーブルのインデックス
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_org_master_code ON organization_master(code)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_org_master_parent_code ON organization_master(parent_code)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_org_master_hierarchy_level ON organization_master(hierarchy_level)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_org_master_company_code ON organization_master(company_code)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_org_master_division_code ON organization_master(division_code)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_org_master_department_code ON organization_master(department_code)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_org_master_section_code ON organization_master(section_code)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_org_master_is_active ON organization_master(is_active)",
            [],
        )?;

        // 注力施策テーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS focusInitiatives (
                id TEXT PRIMARY KEY,
                organizationId TEXT,
                companyId TEXT,
                title TEXT NOT NULL,
                description TEXT,
                content TEXT,
                themeIds TEXT,
                topicIds TEXT,
                createdAt TEXT,
                updatedAt TEXT,
                FOREIGN KEY (organizationId) REFERENCES organizations(id),
                FOREIGN KEY (companyId) REFERENCES companies(id),
                CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR 
                       (organizationId IS NULL AND companyId IS NOT NULL))
            )",
            [],
        )?;
        
        // focusInitiativesテーブルにthemeIdsとtopicIdsカラムを追加（既存のテーブル用）
        // SQLiteではALTER TABLE ADD COLUMN IF NOT EXISTSは使えないため、エラーハンドリングで対応
        let columns_to_add = vec![
            ("themeIds", "TEXT"),
            ("topicIds", "TEXT"),
        ];
        
        for (column_name, column_type) in columns_to_add {
            // カラムが存在するかチェック
            let column_exists: bool = conn.query_row(
                "SELECT COUNT(*) FROM pragma_table_info('focusInitiatives') WHERE name = ?1",
                params![column_name],
                |row| Ok(row.get::<_, i32>(0)? > 0),
            ).unwrap_or(false);
            
            if !column_exists {
                init_log!("📝 focusInitiativesテーブルにカラムを追加: {}", column_name);
                if let Err(e) = conn.execute(
                    &format!("ALTER TABLE focusInitiatives ADD COLUMN {} {}", column_name, column_type),
                    [],
                ) {
                    init_log!("⚠️  カラム追加エラー（既に存在する可能性があります）: {} - {}", column_name, e);
                }
            } else {
                init_log!("ℹ️  focusInitiativesテーブルのカラム '{}' は既に存在します", column_name);
            }
        }

        // 議事録テーブル（ChromaDB同期状態カラムを含む）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS meetingNotes (
                id TEXT PRIMARY KEY,
                organizationId TEXT,
                companyId TEXT,
                title TEXT NOT NULL,
                description TEXT,
                content TEXT,
                chromaSynced INTEGER DEFAULT 0,
                chromaSyncError TEXT,
                lastChromaSyncAttempt TEXT,
                createdAt TEXT,
                updatedAt TEXT,
                FOREIGN KEY (organizationId) REFERENCES organizations(id),
                FOREIGN KEY (companyId) REFERENCES companies(id),
                CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR 
                       (organizationId IS NULL AND companyId IS NOT NULL))
            )",
            [],
        )?;
        
        // meetingNotesテーブルのマイグレーション（organizationIdをNULL可能に）
        // CREATE TABLE IF NOT EXISTSの後に実行することで、既存テーブルが古いスキーマの場合にマイグレーションを実行
        init_log!("🔍 meetingNotesテーブルのマイグレーションを開始します...");
        let meeting_notes_table_exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='meetingNotes'",
            [],
            |row| row.get(0),
        ).unwrap_or(false);
        
        init_log!("📊 meetingNotesテーブルの存在確認: {}", meeting_notes_table_exists);
        
        if meeting_notes_table_exists {
            // organizationIdカラムが存在するかどうかを確認
            let org_id_exists: bool = conn.query_row(
                "SELECT COUNT(*) FROM pragma_table_info('meetingNotes') WHERE name='organizationId'",
                [],
                |row| row.get::<_, i32>(0).map(|n| n > 0),
            ).unwrap_or(false);
            
            init_log!("📊 meetingNotesテーブルのorganizationIdカラムの存在確認: {}", org_id_exists);
            
            if org_id_exists {
                // organizationIdカラムがNOT NULLかどうかを確認
                let org_id_not_null: bool = conn.query_row(
                    "SELECT \"notnull\" FROM pragma_table_info('meetingNotes') WHERE name='organizationId'",
                    [],
                    |row| row.get::<_, i32>(0).map(|n| n != 0),
                ).unwrap_or(false);
                
                init_log!("📊 meetingNotesテーブルのorganizationIdカラムのNOT NULL確認: {}", org_id_not_null);
                
                if org_id_not_null {
                    init_log_always!("📝 meetingNotesテーブルを再作成します（organizationIdをNULL可能に）");
                    
                    // 外部キー制約を一時的に無効化（topicsテーブルがmeetingNotesを参照しているため）
                    if let Err(e) = conn.execute("PRAGMA foreign_keys = OFF", []) {
                        init_log_always!("❌ 外部キー制約の無効化に失敗しました: {}", e);
                    } else {
                        init_log!("✅ 外部キー制約を無効化しました");
                        
                        // 既存データをバックアップテーブルにコピー
                        if let Err(e) = conn.execute("CREATE TABLE IF NOT EXISTS meetingNotes_backup AS SELECT * FROM meetingNotes", []) {
                            init_log_always!("❌ バックアップテーブルの作成に失敗しました: {}", e);
                        } else {
                            init_log!("✅ バックアップテーブルを作成しました");
                            
                            // 古いテーブルを削除
                            if let Err(e) = conn.execute("DROP TABLE meetingNotes", []) {
                                init_log_always!("❌ 古いテーブルの削除に失敗しました: {}", e);
                            } else {
                                init_log!("✅ 古いテーブルを削除しました");
                                
                                // 新しいテーブルを作成（organizationIdをNULL可能に）
                                if let Err(e) = conn.execute(
                                    "CREATE TABLE meetingNotes (
                                        id TEXT PRIMARY KEY,
                                        organizationId TEXT,
                                        companyId TEXT,
                                        title TEXT NOT NULL,
                                        description TEXT,
                                        content TEXT,
                                        chromaSynced INTEGER DEFAULT 0,
                                        chromaSyncError TEXT,
                                        lastChromaSyncAttempt TEXT,
                                        createdAt TEXT,
                                        updatedAt TEXT,
                                        FOREIGN KEY (organizationId) REFERENCES organizations(id),
                                        FOREIGN KEY (companyId) REFERENCES companies(id),
                                        CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR 
                                               (organizationId IS NULL AND companyId IS NOT NULL))
                                    )",
                                    [],
                                ) {
                                    init_log_always!("❌ 新しいテーブルの作成に失敗しました: {}", e);
                                } else {
                                    init_log!("✅ 新しいテーブルを作成しました");
                                    
                                    // バックアップテーブルからデータをコピー
                                    let backup_has_company_id: bool = conn.query_row(
                                        "SELECT COUNT(*) FROM pragma_table_info('meetingNotes_backup') WHERE name='companyId'",
                                        [],
                                        |row| row.get::<_, i32>(0).map(|n| n > 0),
                                    ).unwrap_or(false);
                                    
                                    init_log!("📊 バックアップテーブルのcompanyIdカラムの存在確認: {}", backup_has_company_id);
                                    
                                    if backup_has_company_id {
                                        if let Err(e) = conn.execute(
                                            "INSERT INTO meetingNotes (id, organizationId, companyId, title, description, content, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt) 
                                             SELECT id, organizationId, companyId, title, description, content, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt 
                                             FROM meetingNotes_backup",
                                            [],
                                        ) {
                                            init_log_always!("❌ データのコピーに失敗しました: {}", e);
                                        } else {
                                            init_log!("✅ データをコピーしました（companyIdあり）");
                                        }
                                    } else {
                                        if let Err(e) = conn.execute(
                                            "INSERT INTO meetingNotes (id, organizationId, companyId, title, description, content, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt) 
                                             SELECT id, organizationId, NULL, title, description, content, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt 
                                             FROM meetingNotes_backup",
                                            [],
                                        ) {
                                            init_log_always!("❌ データのコピーに失敗しました: {}", e);
                                        } else {
                                            init_log!("✅ データをコピーしました（companyIdなし）");
                                        }
                                    }
                                    
                                    // バックアップテーブルを削除
                                    let _ = conn.execute("DROP TABLE meetingNotes_backup", []);
                                    
                                    init_log_always!("✅ meetingNotesテーブルの再作成が完了しました");
                                }
                            }
                            
                            // 外部キー制約を再度有効化
                            if let Err(e) = conn.execute("PRAGMA foreign_keys = ON", []) {
                                init_log_always!("❌ 外部キー制約の再有効化に失敗しました: {}", e);
                            } else {
                                init_log!("✅ 外部キー制約を再有効化しました");
                            }
                        }
                    }
                } else {
                    init_log!("ℹ️  meetingNotesテーブルのorganizationIdは既にNULL可能です");
                }
            } else {
                init_log!("ℹ️  meetingNotesテーブルにorganizationIdカラムが存在しません（新規テーブルの可能性）");
            }
        }
        
        // meetingNotesテーブルにcompanyIdカラムを追加（既存のテーブル用）
        let meeting_notes_columns_to_add = vec![("companyId", "TEXT")];
        for (column_name, column_type) in meeting_notes_columns_to_add {
            let column_exists: bool = conn.query_row(
                "SELECT COUNT(*) FROM pragma_table_info('meetingNotes') WHERE name = ?1",
                params![column_name],
                |row| Ok(row.get::<_, i32>(0)? > 0),
            ).unwrap_or(false);
            
            if !column_exists {
                init_log!("📝 meetingNotesテーブルにカラムを追加: {}", column_name);
                if let Err(e) = conn.execute(
                    &format!("ALTER TABLE meetingNotes ADD COLUMN {} {}", column_name, column_type),
                    [],
                ) {
                    init_log!("⚠️  カラム追加エラー（既に存在する可能性があります）: {} - {}", column_name, e);
                }
            } else {
                init_log!("ℹ️  meetingNotesテーブルのカラム '{}' は既に存在します", column_name);
            }
        }
        
        // focusInitiativesテーブルにcompanyIdカラムを追加（既存のテーブル用）
        let focus_initiatives_columns_to_add = vec![("companyId", "TEXT")];
        for (column_name, column_type) in focus_initiatives_columns_to_add {
            let column_exists: bool = conn.query_row(
                "SELECT COUNT(*) FROM pragma_table_info('focusInitiatives') WHERE name = ?1",
                params![column_name],
                |row| Ok(row.get::<_, i32>(0)? > 0),
            ).unwrap_or(false);
            
            if !column_exists {
                init_log!("📝 focusInitiativesテーブルにカラムを追加: {}", column_name);
                if let Err(e) = conn.execute(
                    &format!("ALTER TABLE focusInitiatives ADD COLUMN {} {}", column_name, column_type),
                    [],
                ) {
                    init_log!("⚠️  カラム追加エラー（既に存在する可能性があります）: {} - {}", column_name, e);
                }
            } else {
                init_log!("ℹ️  focusInitiativesテーブルのカラム '{}' は既に存在します", column_name);
            }
        }
        
        // focusInitiativesテーブルの外部キー制約を更新（organizationIdをNULL可能に）
        // SQLiteではALTER TABLEでNOT NULL制約を削除できないため、テーブル再作成が必要
        // 既存テーブルがorganizationIdをNOT NULLとして持っている場合は、テーブルを再作成
        // エラーが発生しても初期化を続行できるようにエラーハンドリングを追加
        if let Err(e) = (|| -> SqlResult<()> {
            let table_exists: bool = conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='focusInitiatives'",
                [],
                |row| row.get(0),
            ).unwrap_or(false);
            
            if table_exists {
                // organizationIdカラムが存在するかどうかを確認
                let org_id_exists: bool = conn.query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('focusInitiatives') WHERE name='organizationId'",
                    [],
                    |row| row.get::<_, i32>(0).map(|n| n > 0),
                ).unwrap_or(false);
                
                if !org_id_exists {
                    init_log!("ℹ️  focusInitiativesテーブルにorganizationIdカラムが存在しません（新規テーブルの可能性）");
                    return Ok(());
                }
                
                // organizationIdカラムがNOT NULLかどうかを確認
                let org_id_not_null: bool = conn.query_row(
                    "SELECT \"notnull\" FROM pragma_table_info('focusInitiatives') WHERE name='organizationId'",
                    [],
                    |row| row.get::<_, i32>(0).map(|n| n != 0),
                ).unwrap_or(false);
                
                if org_id_not_null {
                    init_log!("📝 focusInitiativesテーブルを再作成します（organizationIdをNULL可能に）");
                    
                    // 既存データをバックアップテーブルにコピー
                    conn.execute("CREATE TABLE IF NOT EXISTS focusInitiatives_backup AS SELECT * FROM focusInitiatives", [])?;
                    
                    // 古いテーブルを削除
                    conn.execute("DROP TABLE focusInitiatives", [])?;
                    
                    // 新しいテーブルを作成（organizationIdをNULL可能に）
                    conn.execute(
                        "CREATE TABLE focusInitiatives (
                            id TEXT PRIMARY KEY,
                            organizationId TEXT,
                            companyId TEXT,
                            title TEXT NOT NULL,
                            description TEXT,
                            content TEXT,
                            themeIds TEXT,
                            topicIds TEXT,
                            createdAt TEXT,
                            updatedAt TEXT,
                            FOREIGN KEY (organizationId) REFERENCES organizations(id),
                            FOREIGN KEY (companyId) REFERENCES companies(id),
                            CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR 
                                   (organizationId IS NULL AND companyId IS NOT NULL))
                        )",
                        [],
                    )?;
                    
                    // バックアップテーブルからデータをコピー（カラム名を明示的に指定）
                    // companyIdカラムが存在しない場合はNULLを設定
                    let backup_has_company_id: bool = conn.query_row(
                        "SELECT COUNT(*) FROM pragma_table_info('focusInitiatives_backup') WHERE name='companyId'",
                        [],
                        |row| row.get::<_, i32>(0).map(|n| n > 0),
                    ).unwrap_or(false);
                    
                    // themeIdsとtopicIdsカラムの存在も確認
                    let backup_has_theme_ids: bool = conn.query_row(
                        "SELECT COUNT(*) FROM pragma_table_info('focusInitiatives_backup') WHERE name='themeIds'",
                        [],
                        |row| row.get::<_, i32>(0).map(|n| n > 0),
                    ).unwrap_or(false);
                    
                    let backup_has_topic_ids: bool = conn.query_row(
                        "SELECT COUNT(*) FROM pragma_table_info('focusInitiatives_backup') WHERE name='topicIds'",
                        [],
                        |row| row.get::<_, i32>(0).map(|n| n > 0),
                    ).unwrap_or(false);
                    
                    if backup_has_company_id && backup_has_theme_ids && backup_has_topic_ids {
                        conn.execute(
                            "INSERT INTO focusInitiatives (id, organizationId, companyId, title, description, content, themeIds, topicIds, createdAt, updatedAt) 
                             SELECT id, organizationId, companyId, title, description, content, themeIds, topicIds, createdAt, updatedAt 
                             FROM focusInitiatives_backup",
                            [],
                        )?;
                    } else {
                        // 古いテーブル構造の場合、不足しているカラムはNULLを設定
                        let company_id_col = if backup_has_company_id { "companyId" } else { "NULL" };
                        let theme_ids_col = if backup_has_theme_ids { "themeIds" } else { "NULL" };
                        let topic_ids_col = if backup_has_topic_ids { "topicIds" } else { "NULL" };
                        
                        conn.execute(
                            &format!(
                                "INSERT INTO focusInitiatives (id, organizationId, companyId, title, description, content, themeIds, topicIds, createdAt, updatedAt) 
                                 SELECT id, organizationId, {}, title, description, content, {}, {}, createdAt, updatedAt 
                                 FROM focusInitiatives_backup",
                                company_id_col, theme_ids_col, topic_ids_col
                            ),
                            [],
                        )?;
                    }
                    
                    // バックアップテーブルを削除
                    conn.execute("DROP TABLE focusInitiatives_backup", [])?;
                    
                    init_log!("✅ focusInitiativesテーブルの再作成が完了しました");
                } else {
                    init_log!("ℹ️  focusInitiativesテーブルのorganizationIdは既にNULL可能です");
                }
            }
            Ok(())
        })() {
            init_log!("⚠️  focusInitiativesテーブルのマイグレーションでエラーが発生しました（続行します）: {}", e);
        }
        
        // 事業会社コンテンツテーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS companyContents (
                id TEXT PRIMARY KEY,
                companyId TEXT NOT NULL,
                introduction TEXT,
                focusBusinesses TEXT,
                capitalStructure TEXT,
                capitalStructureDiagram TEXT,
                createdAt TEXT,
                updatedAt TEXT,
                FOREIGN KEY (companyId) REFERENCES companies(id)
            )",
            [],
        )?;
        
        // companyContentsテーブルにcapitalStructureとcapitalStructureDiagramカラムを追加（マイグレーション）
        if let Err(e) = (|| -> SqlResult<()> {
            // capitalStructureカラムの存在確認
            let mut stmt = conn.prepare("PRAGMA table_info(companyContents)")?;
            let columns: Vec<String> = stmt.query_map([], |row| {
                Ok(row.get::<_, String>(1)?)
            })?.collect::<Result<Vec<_>, _>>()?;
            
            if !columns.contains(&"capitalStructure".to_string()) {
                init_log!("📝 companyContentsテーブルにcapitalStructureカラムを追加します");
                conn.execute("ALTER TABLE companyContents ADD COLUMN capitalStructure TEXT", [])?;
                init_log!("✅ capitalStructureカラムを追加しました");
            }
            
            if !columns.contains(&"capitalStructureDiagram".to_string()) {
                init_log!("📝 companyContentsテーブルにcapitalStructureDiagramカラムを追加します");
                conn.execute("ALTER TABLE companyContents ADD COLUMN capitalStructureDiagram TEXT", [])?;
                init_log!("✅ capitalStructureDiagramカラムを追加しました");
            }
            
            Ok(())
        })() {
            init_log!("⚠️  companyContentsテーブルのマイグレーションでエラーが発生しました（続行します）: {}", e);
        }

        // テーマテーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS themes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                initiativeIds TEXT,
                createdAt TEXT,
                updatedAt TEXT
            )",
            [],
        )?;

        // テーマ階層設定テーブル（A2C100用）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS themeHierarchyConfigs (
                id TEXT PRIMARY KEY,
                maxLevels INTEGER NOT NULL,
                levels TEXT NOT NULL,
                createdAt TEXT,
                updatedAt TEXT
            )",
            [],
        )?;

        // エンティティテーブル（ナレッジグラフ用、ChromaDB同期状態カラムを含む）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS entities (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                aliases TEXT,
                metadata TEXT,
                organizationId TEXT,
                companyId TEXT,
                chromaSynced INTEGER DEFAULT 0,
                chromaSyncError TEXT,
                lastChromaSyncAttempt TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (organizationId) REFERENCES organizations(id),
                FOREIGN KEY (companyId) REFERENCES companies(id),
                CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR 
                       (organizationId IS NULL AND companyId IS NOT NULL))
            )",
            [],
        )?;

        // 関係テーブル（ChromaDB同期状態カラムを含む）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS relations (
                id TEXT PRIMARY KEY,
                topicId TEXT NOT NULL,
                sourceEntityId TEXT,
                targetEntityId TEXT,
                relationType TEXT NOT NULL,
                description TEXT,
                confidence REAL,
                metadata TEXT,
                organizationId TEXT,
                companyId TEXT,
                chromaSynced INTEGER DEFAULT 0,
                chromaSyncError TEXT,
                lastChromaSyncAttempt TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (sourceEntityId) REFERENCES entities(id),
                FOREIGN KEY (targetEntityId) REFERENCES entities(id),
                FOREIGN KEY (organizationId) REFERENCES organizations(id),
                FOREIGN KEY (companyId) REFERENCES companies(id),
                CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR 
                       (organizationId IS NULL AND companyId IS NOT NULL))
            )",
            [],
        )?;
        
        // entitiesテーブルのマイグレーション（companyIdカラムとCHECK制約を追加）
        init_log!("🔍 entitiesテーブルのマイグレーションを開始します...");
        if let Err(e) = (|| -> SqlResult<()> {
            let entities_table_exists: bool = conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='entities'",
                [],
                |row| row.get(0),
            ).unwrap_or(false);
            
            init_log!("📊 entitiesテーブルの存在確認: {}", entities_table_exists);
            
            if entities_table_exists {
                // companyIdカラムが存在するかどうかを確認
                let company_id_exists: bool = conn.query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('entities') WHERE name='companyId'",
                    [],
                    |row| row.get::<_, i32>(0).map(|n| n > 0),
                ).unwrap_or(false);
                
                init_log!("📊 entitiesテーブルのcompanyIdカラムの存在確認: {}", company_id_exists);
                
                if !company_id_exists {
                    init_log_always!("📝 entitiesテーブルを再作成します（companyIdカラムとCHECK制約を追加）");
                    
                    // 外部キー制約を一時的に無効化（relationsテーブルがentitiesを参照しているため）
                    conn.execute("PRAGMA foreign_keys = OFF", [])?;
                    init_log!("✅ 外部キー制約を無効化しました");
                    
                    // 既存データをバックアップテーブルにコピー
                    conn.execute("CREATE TABLE IF NOT EXISTS entities_backup AS SELECT * FROM entities", [])?;
                    init_log!("✅ バックアップテーブルを作成しました");
                    
                    // 古いテーブルを削除
                    conn.execute("DROP TABLE entities", [])?;
                    init_log!("✅ 古いテーブルを削除しました");
                    
                    // 新しいテーブルを作成（companyIdカラムとCHECK制約を追加）
                    conn.execute(
                        "CREATE TABLE entities (
                            id TEXT PRIMARY KEY,
                            name TEXT NOT NULL,
                            type TEXT NOT NULL,
                            aliases TEXT,
                            metadata TEXT,
                            organizationId TEXT,
                            companyId TEXT,
                            chromaSynced INTEGER DEFAULT 0,
                            chromaSyncError TEXT,
                            lastChromaSyncAttempt TEXT,
                            createdAt TEXT NOT NULL,
                            updatedAt TEXT NOT NULL,
                            FOREIGN KEY (organizationId) REFERENCES organizations(id),
                            FOREIGN KEY (companyId) REFERENCES companies(id),
                            CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR 
                                   (organizationId IS NULL AND companyId IS NOT NULL))
                        )",
                        [],
                    )?;
                    init_log!("✅ 新しいテーブルを作成しました");
                    
                    // バックアップテーブルからデータをコピー
                    conn.execute(
                        "INSERT INTO entities (id, name, type, aliases, metadata, organizationId, companyId, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt) 
                         SELECT id, name, type, aliases, metadata, organizationId, NULL, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt 
                         FROM entities_backup",
                        [],
                    )?;
                    init_log!("✅ データをコピーしました");
                    
                    // バックアップテーブルを削除
                    let _ = conn.execute("DROP TABLE entities_backup", []);
                    
                    // 外部キー制約を再度有効化
                    conn.execute("PRAGMA foreign_keys = ON", [])?;
                    init_log!("✅ 外部キー制約を再有効化しました");
                    
                    init_log_always!("✅ entitiesテーブルの再作成が完了しました");
                } else {
                    init_log!("ℹ️  entitiesテーブルにcompanyIdカラムは既に存在します");
                }
            } else {
                init_log!("ℹ️  entitiesテーブルが存在しません（新規テーブルの可能性）");
            }
            Ok(())
        })() {
            init_log_always!("❌ entitiesテーブルのマイグレーション中にエラーが発生しました: {}", e);
        }
        
        // relationsテーブルのマイグレーション（companyIdカラムとCHECK制約を追加）
        init_log!("🔍 relationsテーブルのマイグレーションを開始します...");
        if let Err(e) = (|| -> SqlResult<()> {
            let relations_table_exists: bool = conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='relations'",
                [],
                |row| row.get(0),
            ).unwrap_or(false);
            
            init_log!("📊 relationsテーブルの存在確認: {}", relations_table_exists);
            
            if relations_table_exists {
                // companyIdカラムが存在するかどうかを確認
                let company_id_exists: bool = conn.query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('relations') WHERE name='companyId'",
                    [],
                    |row| row.get::<_, i32>(0).map(|n| n > 0),
                ).unwrap_or(false);
                
                init_log!("📊 relationsテーブルのcompanyIdカラムの存在確認: {}", company_id_exists);
                
                if !company_id_exists {
                    init_log_always!("📝 relationsテーブルを再作成します（companyIdカラムとCHECK制約を追加）");
                    
                    // 外部キー制約を一時的に無効化
                    conn.execute("PRAGMA foreign_keys = OFF", [])?;
                    init_log!("✅ 外部キー制約を無効化しました");
                    
                    // 既存データをバックアップテーブルにコピー
                    conn.execute("CREATE TABLE IF NOT EXISTS relations_backup AS SELECT * FROM relations", [])?;
                    init_log!("✅ バックアップテーブルを作成しました");
                    
                    // 古いテーブルを削除
                    conn.execute("DROP TABLE relations", [])?;
                    init_log!("✅ 古いテーブルを削除しました");
                    
                    // 新しいテーブルを作成（companyIdカラムとCHECK制約を追加）
                    conn.execute(
                        "CREATE TABLE relations (
                            id TEXT PRIMARY KEY,
                            topicId TEXT NOT NULL,
                            sourceEntityId TEXT,
                            targetEntityId TEXT,
                            relationType TEXT NOT NULL,
                            description TEXT,
                            confidence REAL,
                            metadata TEXT,
                            organizationId TEXT,
                            companyId TEXT,
                            chromaSynced INTEGER DEFAULT 0,
                            chromaSyncError TEXT,
                            lastChromaSyncAttempt TEXT,
                            createdAt TEXT NOT NULL,
                            updatedAt TEXT NOT NULL,
                            FOREIGN KEY (sourceEntityId) REFERENCES entities(id),
                            FOREIGN KEY (targetEntityId) REFERENCES entities(id),
                            FOREIGN KEY (organizationId) REFERENCES organizations(id),
                            FOREIGN KEY (companyId) REFERENCES companies(id),
                            CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR 
                                   (organizationId IS NULL AND companyId IS NOT NULL))
                        )",
                        [],
                    )?;
                    init_log!("✅ 新しいテーブルを作成しました");
                    
                    // バックアップテーブルからデータをコピー
                    conn.execute(
                        "INSERT INTO relations (id, topicId, sourceEntityId, targetEntityId, relationType, description, confidence, metadata, organizationId, companyId, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt) 
                         SELECT id, topicId, sourceEntityId, targetEntityId, relationType, description, confidence, metadata, organizationId, NULL, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt 
                         FROM relations_backup",
                        [],
                    )?;
                    init_log!("✅ データをコピーしました");
                    
                    // バックアップテーブルを削除
                    let _ = conn.execute("DROP TABLE relations_backup", []);
                    
                    // 外部キー制約を再度有効化
                    conn.execute("PRAGMA foreign_keys = ON", [])?;
                    init_log!("✅ 外部キー制約を再有効化しました");
                    
                    init_log_always!("✅ relationsテーブルの再作成が完了しました");
                } else {
                    init_log!("ℹ️  relationsテーブルにcompanyIdカラムは既に存在します");
                }
            } else {
                init_log!("ℹ️  relationsテーブルが存在しません（新規テーブルの可能性）");
            }
            Ok(())
        })() {
            init_log_always!("❌ relationsテーブルのマイグレーション中にエラーが発生しました: {}", e);
        }
        
        // トピックテーブル（ChromaDB同期状態カラムを含む）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS topics (
                id TEXT PRIMARY KEY,
                topicId TEXT NOT NULL,
                meetingNoteId TEXT NOT NULL,
                organizationId TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                content TEXT,
                semanticCategory TEXT,
                keywords TEXT,
                tags TEXT,
                chromaSynced INTEGER DEFAULT 0,
                chromaSyncError TEXT,
                lastChromaSyncAttempt TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (meetingNoteId) REFERENCES meetingNotes(id),
                FOREIGN KEY (organizationId) REFERENCES organizations(id)
            )",
            [],
        )?;

        // 事業会社テーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS companies (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                nameShort TEXT,
                category TEXT NOT NULL,
                organizationId TEXT NOT NULL,
                company TEXT,
                division TEXT,
                department TEXT,
                region TEXT NOT NULL,
                position INTEGER DEFAULT 0,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (organizationId) REFERENCES organizations(id)
            )",
            [],
        )?;

        // 組織と事業会社の表示関係テーブル（多対多の関係を管理）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS organizationCompanyDisplay (
                id TEXT PRIMARY KEY,
                organizationId TEXT NOT NULL,
                companyId TEXT NOT NULL,
                displayOrder INTEGER DEFAULT 0,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
                FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
                UNIQUE(organizationId, companyId)
            )",
            [],
        )?;

        // 注意: entityEmbeddings、relationEmbeddingsテーブルは廃止されました（ChromaDBに統一）

        // インデックスを作成
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_pageContainers_pageId ON pageContainers(pageId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_pageContainers_planId ON pageContainers(planId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_organizationContents_organizationId ON organizationContents(organizationId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_focusInitiatives_organizationId ON focusInitiatives(organizationId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_focusInitiatives_companyId ON focusInitiatives(companyId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_meetingNotes_organizationId ON meetingNotes(organizationId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_meetingNotes_companyId ON meetingNotes(companyId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_companyContents_companyId ON companyContents(companyId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_themes_id ON themes(id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_entities_organizationId ON entities(organizationId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_entities_companyId ON entities(companyId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_entities_chromaSynced ON entities(chromaSynced)", [])?;
        // 複合インデックス: organizationId + chromaSynced（RAG検索のパフォーマンス向上）
        conn.execute("CREATE INDEX IF NOT EXISTS idx_entities_org_chroma ON entities(organizationId, chromaSynced)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_relations_topicId ON relations(topicId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_relations_sourceEntityId ON relations(sourceEntityId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_relations_targetEntityId ON relations(targetEntityId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_relations_companyId ON relations(companyId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_relations_relationType ON relations(relationType)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_relations_organizationId ON relations(organizationId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_relations_chromaSynced ON relations(chromaSynced)", [])?;
        // 複合インデックス: organizationId + chromaSynced（RAG検索のパフォーマンス向上）
        conn.execute("CREATE INDEX IF NOT EXISTS idx_relations_org_chroma ON relations(organizationId, chromaSynced)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_topics_meetingNoteId ON topics(meetingNoteId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_topics_organizationId ON topics(organizationId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_topics_chromaSynced ON topics(chromaSynced)", [])?;
        // 複合インデックス: organizationId + chromaSynced（RAG検索のパフォーマンス向上）
        conn.execute("CREATE INDEX IF NOT EXISTS idx_topics_org_chroma ON topics(organizationId, chromaSynced)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_meetingNotes_chromaSynced ON meetingNotes(chromaSynced)", [])?;
        // 複合インデックス: organizationId + chromaSynced（RAG検索のパフォーマンス向上）
        conn.execute("CREATE INDEX IF NOT EXISTS idx_meetingNotes_org_chroma ON meetingNotes(organizationId, chromaSynced)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_companies_organizationId ON companies(organizationId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_companies_category ON companies(category)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_organizationCompanyDisplay_organizationId ON organizationCompanyDisplay(organizationId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_organizationCompanyDisplay_companyId ON organizationCompanyDisplay(companyId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_pageContainers_userId ON pageContainers(userId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_organizations_parentId ON organizations(parentId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_organizations_level ON organizations(level)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_organizations_levelName ON organizations(levelName)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_organizationMembers_organizationId ON organizationMembers(organizationId)", [])?;



        // システム設計ドキュメントセクションテーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS designDocSections (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                content TEXT NOT NULL,
                tags TEXT,
                order_index INTEGER DEFAULT 0,
                pageUrl TEXT DEFAULT '/design',
                hierarchy TEXT,
                relatedSections TEXT,
                semanticCategory TEXT,
                keywords TEXT,
                summary TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )",
            [],
        )?;

        // インデックスを作成
        conn.execute("CREATE INDEX IF NOT EXISTS idx_designDocSections_order ON designDocSections(order_index)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_designDocSections_semanticCategory ON designDocSections(semanticCategory)", [])?;

        // システム設計ドキュメントセクション関係テーブル（新規追加）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS designDocSectionRelations (
                id TEXT PRIMARY KEY,
                sourceSectionId TEXT NOT NULL,
                targetSectionId TEXT NOT NULL,
                relationType TEXT NOT NULL,
                description TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (sourceSectionId) REFERENCES designDocSections(id) ON DELETE CASCADE,
                FOREIGN KEY (targetSectionId) REFERENCES designDocSections(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // インデックスを作成
        conn.execute("CREATE INDEX IF NOT EXISTS idx_designDocSectionRelations_source ON designDocSectionRelations(sourceSectionId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_designDocSectionRelations_target ON designDocSectionRelations(targetSectionId)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_designDocSectionRelations_type ON designDocSectionRelations(relationType)", [])?;

        Ok(())
    }

    pub fn create_default_user(&self) -> SqlResult<()> {
        let conn = self.get_connection()?;
        
        // 既存のユーザー数をチェック
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM users",
            [],
            |row| row.get(0),
        )?;

        if count > 0 {
            return Ok(());
        }

        // デフォルトユーザーを作成
        let default_email = "admin@example.com";
        let default_password = "admin123";
        let user_id = Uuid::new_v4().to_string();
        let password_hash = hash(default_password, DEFAULT_COST).unwrap_or_default();
        let now = get_timestamp();

        conn.execute(
            "INSERT INTO users (id, email, passwordHash, approved, createdAt, updatedAt)
             VALUES (?1, ?2, ?3, 1, ?4, ?5)",
            [&user_id, default_email, &password_hash, &now, &now],
        )?;

        init_log!("✅ デフォルトユーザーを作成しました");
        init_log!("   メールアドレス: {}", default_email);
        init_log!("   パスワード: {}", default_password);
        #[cfg(debug_assertions)]
        eprintln!("   ⚠️  本番環境では必ずパスワードを変更してください！");

        Ok(())
    }

}

pub fn init_database(app: &AppHandle) -> SqlResult<()> {
    init_log!("🔧 データベース初期化を開始します...");
    
    // アプリケーションデータディレクトリの取得
    let app_data_dir = match app.path().app_data_dir() {
        Ok(dir) => {
            init_log!("✅ アプリケーションデータディレクトリ: {}", dir.display());
            dir
        },
        Err(e) => {
            init_log_always!("❌ アプリケーションデータディレクトリの取得に失敗しました");
            init_log_always!("   エラー: {}", e);
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some(format!("アプリケーションデータディレクトリの取得に失敗しました: {}", e))
            ));
        }
    };
    
    // ディレクトリの作成
    if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
        init_log_always!("❌ アプリケーションデータディレクトリの作成に失敗しました");
        init_log_always!("   パス: {}", app_data_dir.display());
        init_log_always!("   エラー: {}", e);
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some(format!("ディレクトリ作成エラー: {}", e))
        ));
    }
    
    // ローカル特化型用のデータベースディレクトリ
    let db_dir_name = if cfg!(debug_assertions) {
        "mission-ai-local-dev"
    } else {
        "mission-ai-local"
    };
    let db_dir = app_data_dir.join(db_dir_name);
    if let Err(e) = std::fs::create_dir_all(&db_dir) {
        init_log_always!("❌ データベースディレクトリの作成に失敗しました");
        init_log_always!("   パス: {}", db_dir.display());
        init_log_always!("   エラー: {}", e);
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some(format!("データベースディレクトリ作成エラー: {}", e))
        ));
    }
    
    let db_path = db_dir.join("app.db");
    let db_path_display = db_path.display().to_string();
    
    init_log!("📁 データベースパス: {}", db_path_display);
    
    // データベースの作成
    let db = match Database::new(db_path.clone()) {
        Ok(db) => {
            init_log!("✅ データベース接続成功");
            db
        },
        Err(e) => {
            init_log_always!("❌ データベース作成エラー");
            init_log_always!("   パス: {}", db_path_display);
            init_log_always!("   エラー: {}", e);
            return Err(e);
        }
    };
    
    // テーブルの初期化
    match db.init_tables() {
        Ok(_) => {
            init_log!("✅ テーブル初期化成功");
        },
        Err(e) => {
            init_log_always!("❌ テーブル初期化エラー");
            init_log_always!("   エラー: {}", e);
            return Err(e);
        }
    }
    
    // デフォルトユーザーの作成
    if let Err(e) = db.create_default_user() {
        init_log!("⚠️  デフォルトユーザー作成エラー: {}", e);
            // デフォルトユーザー作成エラーは致命的ではないので続行
    }
    
    // 不要なテーブルを削除（既にChromaDBに移行済みの埋め込みテーブル）
    if let Err(e) = db.drop_unused_tables() {
        init_log!("⚠️  不要なテーブルの削除でエラー: {}", e);
        // エラーを無視して続行（致命的ではない）
    }
    
    // データベースをグローバル変数に設定
    unsafe {
        DB = Some(db);
    }
    
    // データベースが正しく設定されたか確認
    unsafe {
        if DB.is_none() {
            init_log_always!("❌ データベースの設定に失敗しました");
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some("データベースの設定に失敗しました".to_string())
            ));
        }
    }
    
    // 雛形データのインポート（データベースが新規作成された場合のみ）
    let template_path = app.path().resource_dir()
        .map(|dir| dir.join("template-data.json"))
        .ok();
    
    if let Some(template_path) = template_path {
        if let Err(e) = import_template_data_if_empty(&template_path) {
            init_log!("⚠️  雛形データのインポートでエラー: {}", e);
                // エラーを無視して続行（致命的ではない）
            }
    }
    
    init_log!("✅ データベース初期化完了: {}", db_path_display);
    Ok(())
}

/// ChromaDB Serverを初期化（非同期）
pub async fn init_chromadb(app: &AppHandle) -> Result<(), String> {
    init_log!("🔧 ChromaDB Serverの初期化を開始します...");
    
    // データベースディレクトリを取得
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("アプリケーションデータディレクトリの取得に失敗しました: {}", e))?;
    
    let db_dir_name = if cfg!(debug_assertions) {
        "mission-ai-local-dev"
    } else {
        "mission-ai-local"
    };
    
    let db_dir = app_data_dir.join(db_dir_name);
    let chromadb_data_dir = db_dir.join("chromadb");
    
    // ChromaDB Serverのポート番号を環境変数から読み込み、デフォルトは8000
    let chromadb_port = std::env::var("CHROMADB_PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(8000);
    
    #[cfg(debug_assertions)]
    {
        let env_port = std::env::var("CHROMADB_PORT").unwrap_or_else(|_| "未設定（デフォルト8000）".to_string());
        init_log!("🔧 ChromaDB Serverポート: {} (環境変数: {})", chromadb_port, env_port);
    }
    
    chromadb::init_chromadb_server(chromadb_data_dir, chromadb_port).await
}

pub fn get_db() -> Option<&'static Database> {
    unsafe {
        let db_ref = DB.as_ref();
        if db_ref.is_none() {
            #[cfg(debug_assertions)]
            eprintln!("⚠️ get_db() called but database is not initialized");
        }
        db_ref
    }
}

pub fn get_current_user() -> Option<User> {
    unsafe {
        CURRENT_USER.clone()
    }
}

pub fn set_current_user(user: Option<User>) {
    unsafe {
        CURRENT_USER = user;
    }
}

pub fn get_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    format!("{}", now)
}

pub fn to_firestore_timestamp(date_string: &str) -> HashMap<String, i64> {
    let mut ts = HashMap::new();
    // ISO文字列またはUnixタイムスタンプをパース
    if let Ok(secs) = date_string.parse::<i64>() {
        ts.insert("seconds".to_string(), secs);
        ts.insert("nanoseconds".to_string(), 0);
    } else {
        // ISO文字列の場合は現在時刻を使用
        use std::time::{SystemTime, UNIX_EPOCH};
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        ts.insert("seconds".to_string(), now);
        ts.insert("nanoseconds".to_string(), 0);
    }
    ts
}

