// メンバーデータを直接データベースにインポートするスクリプト
// 使用方法: cargo run --bin import_members_direct -- /path/to/organizations-members-2025-12-11.csv

use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("使用方法: cargo run --bin import_members_direct -- <CSVファイルパス>");
        eprintln!("例: cargo run --bin import_members_direct -- organizations-members-2025-12-11.csv");
        std::process::exit(1);
    }

    let csv_path = &args[1];
    println!("📥 CSVファイルを読み込みます: {}", csv_path);

    // データベースパスを取得（開発環境用）
    let app_data_dir = dirs::home_dir()
        .unwrap()
        .join("Library/Application Support/com.missionai.app/ai-assistant-business-plan-local-dev");
    let db_path = app_data_dir.join("app.db");

    println!("📁 データベースパス: {}", db_path.display());

    // データベース接続
    let conn = rusqlite::Connection::open(&db_path).expect("データベースに接続できませんでした");

    // インポート関数を実行
    match import_members_from_csv_direct(&conn, csv_path) {
        Ok(count) => {
            println!("✅ メンバーデータのインポートが完了しました: {}件", count);
        },
        Err(e) => {
            eprintln!("❌ インポートエラー: {}", e);
            std::process::exit(1);
        }
    }
}

fn import_members_from_csv_direct(conn: &rusqlite::Connection, csv_path: &str) -> Result<usize, Box<dyn std::error::Error>> {
    use std::fs::File;
    use std::io::Read;
    use csv::ReaderBuilder;

    let mut file = File::open(csv_path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;

    // BOMを除去
    let contents = if contents.starts_with("\u{FEFF}") {
        &contents[3..]
    } else {
        &contents
    };

    let mut reader = ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .from_reader(contents.as_bytes());

    let mut count = 0;
    let mut line_number = 0;
    let tx = conn.unchecked_transaction()?;
    let now = chrono::Utc::now().timestamp().to_string();

    // 組織ID（UUID）の存在確認用セットを作成
    let mut valid_org_ids: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut org_id_to_name: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    
    // organizationsテーブルから全てのIDを取得
    {
        let mut stmt = conn.prepare("SELECT id, name FROM organizations")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        for row in rows {
            let (id, name) = row?;
            valid_org_ids.insert(id.clone());
            org_id_to_name.insert(id, name);
        }
    }
    
    // organization_masterテーブルからもIDを取得
    {
        let mut stmt = conn.prepare("SELECT id, name_kanji FROM organization_master WHERE is_active = 1")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        for row in rows {
            let (id, name) = row?;
            valid_org_ids.insert(id.clone());
            org_id_to_name.insert(id, name);
        }
    }

    println!("📊 有効な組織ID: {}件", valid_org_ids.len());

    for result in reader.records() {
        line_number += 1;
        
        // 24-191行目のみを処理
        if line_number < 24 || line_number > 191 {
            continue;
        }

        let record = match result {
            Ok(r) => r,
            Err(e) => {
                eprintln!("⚠️  CSVパースエラー（スキップ）: {} (行: {})", e, line_number);
                continue;
            }
        };

        // ヘッダー行をスキップ（24行目がヘッダーの可能性がある）
        if let Some(first_field) = record.get(0) {
            if first_field == "ID" || first_field.is_empty() {
                continue;
            }
        }

        // メンバーデータのカラムを取得
        let member_id = record.get(0).unwrap_or("").to_string();
        let org_id_from_csv = record.get(1).unwrap_or("").to_string(); // CSVの2番目のカラム（組織ID）
        let org_name = record.get(2).unwrap_or("").to_string();
        let member_name = record.get(3).unwrap_or("").to_string();
        let position = record.get(4).unwrap_or("").to_string();
        let name_romaji = record.get(5).unwrap_or("").to_string();
        let department = record.get(6).unwrap_or("").to_string();
        let extension = record.get(7).unwrap_or("").to_string();
        let company_phone = record.get(8).unwrap_or("").to_string();
        let mobile_phone = record.get(9).unwrap_or("").to_string();
        let email = record.get(10).unwrap_or("").to_string();
        let itochu_email = record.get(11).unwrap_or("").to_string();
        let teams = record.get(12).unwrap_or("").to_string();
        let employee_type = record.get(13).unwrap_or("").to_string();
        let role_name = record.get(14).unwrap_or("").to_string();
        let indicator = record.get(15).unwrap_or("").to_string();
        let location = record.get(16).unwrap_or("").to_string();
        let floor_door_no = record.get(17).unwrap_or("").to_string();
        let previous_name = record.get(18).unwrap_or("").to_string();

        if member_id.is_empty() || member_name.is_empty() || org_id_from_csv.is_empty() {
            continue;
        }

        // CSVの組織IDが有効か確認、存在しない場合は組織を作成
        let org_uuid = if !valid_org_ids.contains(&org_id_from_csv) {
            // 組織が存在しない場合は作成
            println!("📝 組織を作成します: {} ({})", org_name, org_id_from_csv);
            if let Err(e) = tx.execute(
                "INSERT OR IGNORE INTO organizations (id, name, level, levelName, createdAt, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    org_id_from_csv.clone(),
                    org_name.clone(),
                    3, // デフォルトレベル（課レベル）
                    "課",
                    now.clone(),
                    now.clone(),
                ],
            ) {
                eprintln!("⚠️  組織作成エラー: {} - {}", org_name, e);
                continue;
            }
            valid_org_ids.insert(org_id_from_csv.clone());
            org_id_from_csv.clone()
        } else {
            org_id_from_csv
        };

        let to_option = |s: String| if s.is_empty() { None } else { Some(s) };

        // メンバーを挿入
        if let Err(e) = tx.execute(
            "INSERT OR REPLACE INTO organizationMembers (
                id, organizationId, name, position, nameRomaji, department, extension,
                companyPhone, mobilePhone, email, itochuEmail, teams, employeeType,
                roleName, indicator, location, floorDoorNo, previousName, createdAt, updatedAt
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
            rusqlite::params![
                member_id,
                org_uuid,
                member_name,
                to_option(position),
                to_option(name_romaji),
                to_option(department),
                to_option(extension),
                to_option(company_phone),
                to_option(mobile_phone),
                to_option(email),
                to_option(itochu_email),
                to_option(teams),
                to_option(employee_type),
                to_option(role_name),
                to_option(indicator),
                to_option(location),
                to_option(floor_door_no),
                to_option(previous_name),
                now.clone(),
                now.clone(),
            ],
        ) {
            eprintln!("⚠️  メンバー挿入エラー: {} - {}", member_name, e);
            continue;
        }

        count += 1;
        if count % 10 == 0 {
            println!("📝 処理中: {}件", count);
        }
    }

    tx.commit()?;
    Ok(count)
}
