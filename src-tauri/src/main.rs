// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod commands;
mod api;
mod db;

use std::net::SocketAddr;
use tauri::Manager;
use db::{WriteJob, WriteWorker, WriteQueueState};

fn main() {
    // ログシステムの初期化（リリースビルドではINFOレベル）
    tracing_subscriber::fmt()
        .with_max_level(if cfg!(debug_assertions) {
            tracing::Level::DEBUG
        } else {
            tracing::Level::INFO
        })
        .with_target(false)
        .init();
    
    tauri::Builder::default()
        .setup(|app| {
            // 開発環境でのみ環境変数ファイルを読み込む
            #[cfg(debug_assertions)]
            {
                // 環境変数ファイルの読み込み（local.envを優先、なければ.env）
                if let Err(_e) = dotenv::from_filename("local.env") {
                    // local.envがない場合は.envを試す
                    if dotenv::from_filename(".env").is_err() {
                        eprintln!("⚠️  環境変数ファイル（local.env または .env）が見つかりません。環境変数から直接読み込みます。");
                    }
                } else {
                    eprintln!("✅ 環境変数ファイル（local.env）を読み込みました");
                }
            }
            
            // リリースビルドでは静的ファイルをTauriのカスタムプロトコルで配信
            // Node.jsサーバーは不要（静的エクスポートを使用）
            #[cfg(not(debug_assertions))]
            {
                eprintln!("✅ 静的ファイルをTauriのカスタムプロトコルで配信します");
                eprintln!("   Node.jsは不要です");
            }
            
            // データベースを初期化
            match database::init_database(app.handle()) {
                Ok(_) => {
                    #[cfg(debug_assertions)]
                    eprintln!("✅ データベース初期化が完了しました");
                    
                    // 書き込みワーカーを起動
                    if let Some(db) = database::get_db() {
                        let pool = db.get_pool();
                        let (write_tx, write_rx) = async_channel::unbounded::<WriteJob>();
                        let write_tx_arc = std::sync::Arc::new(write_tx);
                        let write_worker = WriteWorker::new(pool);
                        
                        // 書き込みワーカーを起動
                        tauri::async_runtime::spawn(async move {
                            write_worker.run(write_rx).await;
                        });
                        
                        // 書き込みキューをアプリの状態として保存
                        app.manage(WriteQueueState {
                            tx: write_tx_arc,
                        });
                        
                        #[cfg(debug_assertions)]
                        eprintln!("✅ 書き込みワーカーを起動しました");
                    } else {
                        eprintln!("⚠️  データベースが初期化されていないため、書き込みワーカーを起動できませんでした");
                    }
                }
                Err(e) => {
                    eprintln!("❌ データベース初期化に失敗しました");
                    eprintln!("   エラー: {}", e);
                    eprintln!("   アプリケーションは起動しますが、データベース機能は使用できません。");
                }
            }
            
            // ChromaDB ServerとAPIサーバーを並列で初期化（非同期）
            let app_handle_chroma = app.handle().clone();
            
            // ChromaDB Serverを初期化（非同期、待機時間なし）
            tauri::async_runtime::spawn(async move {
                match database::init_chromadb(&app_handle_chroma).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDB Serverの初期化が完了しました");
                    }
                    Err(e) => {
                        eprintln!("❌ ChromaDB Serverの初期化に失敗しました: {}", e);
                        eprintln!("   注意: 埋め込みベクトルの保存・検索にはChromaDBが必要です");
                        eprintln!("   トラブルシューティング:");
                        eprintln!("   1. Python環境がインストールされているか確認してください");
                        eprintln!("   2. ChromaDBがインストールされているか確認してください: pip3 install chromadb");
                        eprintln!("   3. ポート8000が使用可能か確認してください");
                        eprintln!("   4. アプリケーションを再起動してください");
                    }
                }
            });
            
            // Rust APIサーバーを起動（ポート番号は環境変数から読み込み、デフォルトは開発環境3010、本番環境3011）
            // 環境変数ファイル（.env または local.env）から読み込まれる
            // 開発環境: 3010, 本番環境: 3011
            // 注意: Next.js開発サーバーは3010を使用するため、APIサーバーも開発環境では3010を使用
            let api_port = std::env::var("API_SERVER_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(if cfg!(debug_assertions) { 3010 } else { 3011 }); // 開発環境: 3010, 本番環境: 3011
            let api_addr = SocketAddr::from(([127, 0, 0, 1], api_port));
            #[cfg(debug_assertions)]
            {
                let env_port = std::env::var("API_SERVER_PORT").unwrap_or_else(|_| "未設定（デフォルト3011）".to_string());
                eprintln!("🔧 APIサーバーポート: {} (環境変数: {})", api_port, env_port);
            }
            tauri::async_runtime::spawn(async move {
                match api::server::start_api_server(api_addr).await {
                    Ok(_) => {
                        #[cfg(debug_assertions)]
                        eprintln!("✅ APIサーバーが正常に起動しました");
                    }
                    Err(e) => {
                        eprintln!("❌ APIサーバーの起動に失敗しました: {}", e);
                        eprintln!("   エラー詳細: {:?}", e);
                    }
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 認証コマンド
            commands::db::sign_in,
            commands::db::sign_up,
            commands::db::sign_out,
            commands::db::get_current_user,
            // ドキュメント操作コマンド
            commands::db::doc_get,
            commands::db::doc_set,
            commands::db::doc_update,
            commands::db::doc_delete,
            commands::db::delete_meeting_note_with_relations,
            // コレクション操作コマンド
            commands::db::collection_add,
            commands::db::collection_get,
            // クエリ操作コマンド
            commands::db::query_get,
            // データエクスポート/インポートコマンド
            commands::db::export_database_data,
            commands::db::import_database_data,
            commands::db::export_organizations_and_members,
            // アプリ情報コマンド
            commands::app::get_version,
            commands::app::get_path,
            commands::app::get_database_path,
            commands::app::get_project_root,
            commands::app::check_database_status,
            commands::app::reinitialize_database,
            commands::app::list_tables,
            commands::app::diagnose_database,
            commands::app::get_table_schema,
            commands::app::update_chroma_sync_status,
            // 組織管理コマンド
            commands::organization::create_org,
            commands::organization::update_org,
            commands::organization::update_org_parent,
            commands::organization::get_org,
            commands::organization::search_orgs_by_name,
            commands::organization::get_orgs_by_parent,
            commands::organization::get_org_tree,
            commands::organization::delete_org,
            commands::organization::add_org_member,
            commands::organization::update_org_member,
            commands::organization::get_org_member,
            commands::organization::get_org_members,
            commands::organization::delete_org_member,
            commands::organization::update_theme_positions_cmd,
            commands::organization::get_themes_cmd,
            commands::organization::get_deletion_targets_cmd,
            // 事業会社管理コマンドは削除（事業会社ページ削除のため）
            // commands::companies::create_company_cmd,
            // commands::companies::update_company_cmd,
            // commands::companies::get_company,
            // commands::companies::get_company_by_code_cmd,
            // commands::companies::get_companies_by_org,
            // commands::companies::get_all_companies_cmd,
            // commands::companies::delete_company_cmd,
            // 組織と事業会社の表示関係管理コマンドは削除（事業会社ページ削除のため）
            // commands::organization_company_display::create_org_company_display,
            // commands::organization_company_display::get_companies_by_org_display,
            // commands::organization_company_display::get_organizations_by_company_display_cmd,
            // commands::organization_company_display::get_all_org_company_displays,
            // commands::organization_company_display::update_org_company_display_order,
            // commands::organization_company_display::delete_org_company_display,
            // commands::organization_company_display::delete_org_company_display_by_ids,
            // commands::organization_company_display::delete_all_org_company_displays_by_org,
            // commands::organization_company_display::delete_all_org_company_displays_by_company,
            // ChromaDBコマンド
            commands::chromadb::chromadb_save_entity_embedding,
            commands::chromadb::chromadb_get_entity_embedding,
            commands::chromadb::chromadb_find_similar_entities,
            commands::chromadb::chromadb_count_entities,
            commands::chromadb::chromadb_save_relation_embedding,
            commands::chromadb::chromadb_get_relation_embedding,
            commands::chromadb::chromadb_find_similar_relations,
            commands::chromadb::chromadb_save_topic_embedding,
            commands::chromadb::chromadb_get_topic_embedding,
            commands::chromadb::chromadb_find_similar_topics,
            commands::chromadb::chromadb_save_design_doc_embedding,
            commands::chromadb::chromadb_find_similar_design_docs,
            commands::chromadb::chromadb_get_design_doc_metadata,
            commands::chromadb::chromadb_list_design_doc_section_ids,
            commands::chromadb::chromadb_delete_topic_embedding,
            commands::chromadb::chromadb_delete_entity_embedding,
            commands::chromadb::chromadb_delete_relation_embedding,
            commands::chromadb::chromadb_clear_data_dir,
            commands::chromadb::chromadb_delete_organization_collections,
            // システム設計ドキュメントセクション管理コマンド
            commands::design_doc::create_design_doc_section_cmd,
            commands::design_doc::update_design_doc_section_cmd,
            commands::design_doc::get_design_doc_section_cmd,
            commands::design_doc::get_all_design_doc_sections_cmd,
            commands::design_doc::get_all_design_doc_sections_lightweight_cmd,
            commands::design_doc::delete_design_doc_section_cmd,
            // システム設計ドキュメントセクション関係管理コマンド
            commands::design_doc::create_design_doc_section_relation_cmd,
            commands::design_doc::update_design_doc_section_relation_cmd,
            commands::design_doc::get_design_doc_section_relation_cmd,
            commands::design_doc::get_design_doc_section_relations_by_section_cmd,
            commands::design_doc::get_all_design_doc_section_relations_cmd,
            commands::design_doc::delete_design_doc_section_relation_cmd,
            // ファイル操作コマンド
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::file_exists,
            commands::fs::save_image_file,
            // PlantUMLコマンド
            commands::plantuml::render_plantuml,
            commands::plantuml::check_java_installed,
            // Agentシステムコマンド
            commands::agent_system::save_task_command,
            commands::agent_system::get_task_command,
            commands::agent_system::get_all_tasks_command,
            commands::agent_system::delete_task_command,
            commands::agent_system::save_task_execution_command,
            commands::agent_system::get_task_execution_command,
            commands::agent_system::get_task_executions_command,
            commands::agent_system::get_all_task_executions_command,
            commands::agent_system::save_task_chain_command,
            commands::agent_system::get_task_chain_command,
            commands::agent_system::get_all_task_chains_command,
            commands::agent_system::delete_task_chain_command,
            commands::agent_system::save_agent_command,
            commands::agent_system::get_agent_command,
            commands::agent_system::get_all_agents_command,
            commands::agent_system::delete_agent_command,
            commands::agent_system::save_mcp_tool_command,
            commands::agent_system::get_mcp_tool_command,
            commands::agent_system::get_all_mcp_tools_command,
            commands::agent_system::get_enabled_mcp_tools_command,
            commands::agent_system::delete_mcp_tool_command,
            commands::agent_system::update_mcp_tool_enabled_command,
            // システムリソース監視コマンド
            commands::system::get_system_resources,
            commands::system::get_process_resources,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

