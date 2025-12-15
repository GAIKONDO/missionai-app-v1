use std::process::{Command, Stdio};
use std::path::PathBuf;
use std::fs;
use std::io::Write;
use anyhow::Result;
use tauri::{AppHandle, Manager};

/// Javaのパスを検出する
fn detect_java() -> Result<PathBuf> {
    // 1. JAVA_HOME環境変数を確認
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let java_path = PathBuf::from(&java_home).join("bin").join("java");
        if java_path.exists() {
            return Ok(java_path);
        }
        // Windowsの場合、java.exeを確認
        let java_exe = PathBuf::from(&java_home).join("bin").join("java.exe");
        if java_exe.exists() {
            return Ok(java_exe);
        }
    }
    
    // 2. PATHからjavaコマンドを検索
    let java_cmd = if cfg!(target_os = "windows") {
        "java.exe"
    } else {
        "java"
    };
    
    if let Ok(output) = Command::new(java_cmd).arg("-version").output() {
        if output.status.success() {
            return Ok(PathBuf::from(java_cmd));
        }
    }
    
    anyhow::bail!("Javaが見つかりません。Javaをインストールしてください。\n\n対処法:\n1. Javaをインストールしてください（https://www.java.com/）\n2. JAVA_HOME環境変数を設定してください\n3. PATHにjavaコマンドが含まれているか確認してください");
}

/// PlantUML JARファイルのパスを取得
fn get_plantuml_jar_path(app_handle: &AppHandle) -> Result<PathBuf> {
    // 1. リソースディレクトリからplantuml.jarを探す
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let jar_path = resource_dir.join("plantuml.jar");
        if jar_path.exists() {
            return Ok(jar_path);
        }
    }
    
    // 2. アプリのデータディレクトリを確認
    if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
        let jar_path = app_data_dir.join("plantuml.jar");
        if jar_path.exists() {
            return Ok(jar_path);
        }
    }
    
    // 3. 開発環境の場合、プロジェクトルートからの相対パスを確認
    let mut dev_paths = vec![
        PathBuf::from("src-tauri/resources/plantuml.jar"),
        PathBuf::from("resources/plantuml.jar"),
    ];
    
    // カレントディレクトリから見たパスを追加
    if let Ok(current_dir) = std::env::current_dir() {
        dev_paths.push(current_dir.join("src-tauri").join("resources").join("plantuml.jar"));
        dev_paths.push(current_dir.join("resources").join("plantuml.jar"));
    }
    
    for path in dev_paths {
        if path.exists() {
            return Ok(path);
        }
    }
    
    // 4. 実行ファイルのディレクトリを確認
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let jar_path = exe_dir.join("plantuml.jar");
            if jar_path.exists() {
                return Ok(jar_path);
            }
            // resourcesサブディレクトリも確認
            let jar_path = exe_dir.join("resources").join("plantuml.jar");
            if jar_path.exists() {
                return Ok(jar_path);
            }
        }
    }
    
    anyhow::bail!(
        "PlantUML JARファイルが見つかりません。\n\n\
        対処法:\n\
        1. PlantUML JARファイルをダウンロードしてください:\n\
           curl -L -o src-tauri/resources/plantuml.jar https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml/1.2024.8/plantuml-1.2024.8.jar\n\n\
        2. または、以下のいずれかの場所にplantuml.jarを配置してください:\n\
           - src-tauri/resources/plantuml.jar\n\
           - resources/plantuml.jar\n\
           - アプリのデータディレクトリ/plantuml.jar"
    );
}

/// PlantUMLコードをレンダリングする
#[tauri::command]
pub async fn render_plantuml(
    app_handle: AppHandle,
    code: String,
    format: String, // "svg" or "png"
) -> Result<Vec<u8>, String> {
    // フォーマットの検証
    let format = format.to_lowercase();
    if format != "svg" && format != "png" {
        return Err(format!("無効なフォーマット: {}. 'svg' または 'png' を指定してください。", format));
    }
    
    // 1. Javaのパスを検出
    let java_path = detect_java().map_err(|e| e.to_string())?;
    
    // 2. PlantUML JARファイルのパスを取得
    let jar_path = get_plantuml_jar_path(&app_handle).map_err(|e| e.to_string())?;
    
    // 3. PlantUMLコードを一時ファイルに保存
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join(format!("plantuml_{}.puml", uuid::Uuid::new_v4()));
    
    fs::write(&temp_file, &code)
        .map_err(|e| format!("一時ファイルの作成に失敗しました: {}", e))?;
    
    // 4. Javaプロセスを起動してPlantUMLを実行（標準出力に出力）
    // PlantUMLは-pipeオプションで標準出力にSVG/PNGを出力できる
    let mut child = Command::new(&java_path)
        .arg("-jar")
        .arg(&jar_path)
        .arg("-pipe")
        .arg(&format!("-t{}", format))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("PlantUMLプロセスの起動に失敗しました: {}", e))?;
    
    // 5. 標準入力にPlantUMLコードを書き込む
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(code.as_bytes())
            .map_err(|e| format!("PlantUMLコードの書き込みに失敗しました: {}", e))?;
        stdin.flush()
            .map_err(|e| format!("標準入力のフラッシュに失敗しました: {}", e))?;
        // stdinを閉じる（drop）
    }
    
    // 6. プロセスの完了を待つ
    let output = child.wait_with_output()
        .map_err(|e| format!("PlantUMLの実行に失敗しました: {}", e))?;
    
    // 7. 一時ファイルを削除
    let _ = fs::remove_file(&temp_file);
    
    // 8. エラーチェック
    let stderr_text = String::from_utf8_lossy(&output.stderr);
    let stdout_text = String::from_utf8_lossy(&output.stdout);
    
    // Graphviz関連のエラーを検出
    let is_graphviz_error = stderr_text.contains("Cannot find Graphviz") ||
                            stderr_text.contains("Dot executable does not exist") ||
                            stderr_text.contains("Graphviz");
    
    if !output.status.success() {
        let error_msg = if !stderr_text.is_empty() {
            stderr_text.to_string()
        } else if !stdout_text.is_empty() {
            stdout_text.to_string()
        } else {
            "PlantUMLの実行に失敗しました（詳細不明）".to_string()
        };
        
        // Graphvizエラーの場合、より詳細なメッセージを提供
        if is_graphviz_error {
            return Err(format!(
                "PlantUMLエラー: Graphvizが見つかりません。\n\n\
                エラー詳細: {}\n\n\
                対処法:\n\
                1. Graphvizをインストールしてください:\n\
                   macOS (Homebrew): brew install graphviz\n\
                   macOS (MacPorts): sudo port install graphviz\n\
                   Linux (apt): sudo apt-get install graphviz\n\
                   Linux (yum): sudo yum install graphviz\n\
                2. インストール後、dotコマンドがPATHに含まれているか確認してください:\n\
                   which dot\n\
                3. アプリを再起動してください\n\n\
                注意: 一部のPlantUML図タイプ（クラス図、シーケンス図など）はGraphvizが必要です。",
                error_msg
            ));
        }
        
        return Err(format!("PlantUMLエラー: {}", error_msg));
    }
    
    // 9. 標準出力が空の場合は、生成されたファイルを読み込む（フォールバック）
    if output.stdout.is_empty() {
        eprintln!("⚠️ [PlantUML] 標準出力が空です。ファイル出力を確認します。");
        eprintln!("   一時ファイル: {:?}", temp_file);
        eprintln!("   標準エラー: {}", stderr_text);
        
        // Graphvizエラーの場合
        if is_graphviz_error {
            return Err(format!(
                "PlantUMLが空の出力を返しました。Graphvizが見つかりません。\n\n\
                標準エラー: {}\n\n\
                対処法:\n\
                1. Graphvizをインストールしてください:\n\
                   macOS (Homebrew): brew install graphviz\n\
                   macOS (MacPorts): sudo port install graphviz\n\
                2. インストール後、アプリを再起動してください",
                stderr_text
            ));
        }
        
        // PlantUMLがファイルに出力した場合、一時ファイルと同じディレクトリに生成される
        let output_file = temp_file.with_extension(format!("{}", format));
        eprintln!("   出力ファイルパス: {:?}", output_file);
        
        if output_file.exists() {
            eprintln!("✅ [PlantUML] 出力ファイルが見つかりました");
            let file_data = fs::read(&output_file)
                .map_err(|e| format!("生成されたファイルの読み込みに失敗しました: {}", e))?;
            let _ = fs::remove_file(&output_file);
            eprintln!("✅ [PlantUML] ファイルデータを読み込みました: {} bytes", file_data.len());
            return Ok(file_data);
        }
        
        // 一時ファイルのディレクトリ内のすべてのファイルを確認（デバッグ用）
        if let Some(parent) = temp_file.parent() {
            eprintln!("   ディレクトリ内のファイル:");
            if let Ok(entries) = fs::read_dir(parent) {
                for entry in entries.flatten() {
                    eprintln!("     - {:?}", entry.path());
                }
            }
        }
        
        return Err(format!(
            "PlantUMLが空の出力を返しました。\n\n\
            標準エラー: {}\n\n\
            考えられる原因:\n\
            1. PlantUMLコードに構文エラーがある\n\
            2. Javaのバージョンが古い\n\
            3. PlantUML JARファイルが破損している\n\
            4. Graphvizがインストールされていない（一部の図タイプで必要）",
            stderr_text
        ));
    }
    
    // 10. 生成された画像データを返す
    eprintln!("✅ [PlantUML] 標準出力からデータを取得しました: {} bytes", output.stdout.len());
    Ok(output.stdout)
}

/// Javaがインストールされているか確認する
#[tauri::command]
pub async fn check_java_installed() -> Result<bool, String> {
    match detect_java() {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
