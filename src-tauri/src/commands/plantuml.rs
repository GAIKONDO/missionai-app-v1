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
    
    // 2. macOSの場合、複数の方法でJavaを検索
    #[cfg(target_os = "macos")]
    {
        // 2-1. HomebrewのOpenJDKを確認（/opt/homebrew/opt/openjdk/bin/java）
        let homebrew_java_paths = vec![
            PathBuf::from("/opt/homebrew/opt/openjdk/bin/java"),
            PathBuf::from("/opt/homebrew/opt/openjdk@17/bin/java"),
            PathBuf::from("/opt/homebrew/opt/openjdk@21/bin/java"),
            PathBuf::from("/opt/homebrew/bin/java"),
            PathBuf::from("/usr/local/opt/openjdk/bin/java"),
            PathBuf::from("/usr/local/bin/java"),
        ];
        
        for java_path in homebrew_java_paths {
            if java_path.exists() {
                if let Ok(output) = Command::new(&java_path).arg("-version").output() {
                    if output.status.success() {
                        return Ok(java_path);
                    }
                }
            }
        }
        
        // 2-2. /usr/libexec/java_homeでデフォルトのJavaを取得
        if let Ok(output) = Command::new("/usr/libexec/java_home").output() {
            if output.status.success() {
                if let Ok(java_home_str) = String::from_utf8(output.stdout) {
                    let java_home = java_home_str.trim();
                    if !java_home.is_empty() {
                        let java_path = PathBuf::from(java_home).join("bin").join("java");
                        if java_path.exists() {
                            if let Ok(version_output) = Command::new(&java_path).arg("-version").output() {
                                if version_output.status.success() {
                                    return Ok(java_path);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // 2-3. /usr/libexec/java_home -Vで利用可能なJavaをリストアップ
        if let Ok(output) = Command::new("/usr/libexec/java_home").arg("-V").output() {
            // -Vオプションはstderrに出力される
            if let Ok(stderr_str) = String::from_utf8(output.stderr) {
                // 各行からJavaのパスを抽出
                for line in stderr_str.lines() {
                    if let Some(start) = line.find("(/") {
                        if let Some(end) = line[start+2..].find(")") {
                            let java_home = &line[start+1..start+2+end];
                            let java_path = PathBuf::from(java_home).join("bin").join("java");
                            if java_path.exists() {
                                if let Ok(version_output) = Command::new(&java_path).arg("-version").output() {
                                    if version_output.status.success() {
                                        return Ok(java_path);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // 2-4. /usr/bin/javaを確認（シンボリックリンクの場合もある）
        let usr_bin_java = PathBuf::from("/usr/bin/java");
        if usr_bin_java.exists() {
            if let Ok(output) = Command::new("/usr/bin/java").arg("-version").output() {
                if output.status.success() {
                    return Ok(usr_bin_java);
                }
            }
        }
        
        // 2-5. JavaVirtualMachinesディレクトリ内を検索
        let jvm_dirs = vec![
            PathBuf::from("/Library/Java/JavaVirtualMachines"),
            PathBuf::from("/System/Library/Java/JavaVirtualMachines"),
            PathBuf::from("/opt/homebrew/Cellar/openjdk"),
        ];
        
        for jvm_dir in jvm_dirs {
            if let Ok(entries) = std::fs::read_dir(&jvm_dir) {
                // ディレクトリをソートして、最新のバージョンを優先
                let mut jvm_paths: Vec<PathBuf> = entries
                    .flatten()
                    .map(|entry| entry.path())
                    .collect();
                jvm_paths.sort_by(|a, b| b.cmp(a)); // 降順ソート
                
                for jvm_path in jvm_paths {
                    // 標準的なJVM構造を確認
                    let java_paths = vec![
                        jvm_path.join("Contents").join("Home").join("bin").join("java"),
                        jvm_path.join("bin").join("java"),
                    ];
                    
                    for java_path in java_paths {
                        if java_path.exists() {
                            if let Ok(output) = Command::new(&java_path).arg("-version").output() {
                                if output.status.success() {
                                    return Ok(java_path);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 3. PATHからjavaコマンドを検索（GUIアプリでも動作するように、環境変数を明示的に設定）
    let java_cmd = if cfg!(target_os = "windows") {
        "java.exe"
    } else {
        "java"
    };
    
    // macOSの場合、PATHにHomebrewのパスを追加してから検索
    #[cfg(target_os = "macos")]
    {
        // PATH環境変数を設定（GUIアプリから起動した場合でも動作するように）
        let path_env = std::env::var("PATH").unwrap_or_default();
        let homebrew_paths = "/opt/homebrew/bin:/opt/homebrew/opt/openjdk/bin:/usr/local/bin:/usr/bin:/bin";
        let new_path = if path_env.is_empty() {
            homebrew_paths.to_string()
        } else {
            format!("{}:{}", homebrew_paths, path_env)
        };
        
        let mut cmd = Command::new(java_cmd);
        cmd.arg("-version");
        cmd.env("PATH", &new_path);
        
        if let Ok(output) = cmd.output() {
            if output.status.success() {
                // javaコマンドが見つかった場合、フルパスを取得
                let mut which_cmd = Command::new("which");
                which_cmd.arg(java_cmd);
                which_cmd.env("PATH", &new_path);
                if let Ok(which_output) = which_cmd.output() {
                    if which_output.status.success() {
                        if let Ok(path_str) = String::from_utf8(which_output.stdout) {
                            let java_path = PathBuf::from(path_str.trim());
                            if java_path.exists() {
                                return Ok(java_path);
                            }
                        }
                    }
                }
                // whichが失敗した場合でも、javaコマンド自体は動作しているので、それを返す
                return Ok(PathBuf::from(java_cmd));
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        if let Ok(output) = Command::new(java_cmd).arg("-version").output() {
            if output.status.success() {
                return Ok(PathBuf::from(java_cmd));
            }
        }
    }
    
    // 4. Windowsの場合、レジストリから検索（オプション）
    #[cfg(target_os = "windows")]
    {
        // Windowsの標準的なJavaの場所を確認
        let windows_java_paths = vec![
            PathBuf::from("C:\\Program Files\\Java"),
            PathBuf::from("C:\\Program Files (x86)\\Java"),
        ];
        
        for java_dir in windows_java_paths {
            if let Ok(entries) = std::fs::read_dir(&java_dir) {
                for entry in entries.flatten() {
                    let java_path = entry.path().join("bin").join("java.exe");
                    if java_path.exists() {
                        if let Ok(output) = Command::new(&java_path).arg("-version").output() {
                            if output.status.success() {
                                return Ok(java_path);
                            }
                        }
                    }
                }
            }
        }
    }
    
    anyhow::bail!("Javaが見つかりません。Javaをインストールしてください。\n\n対処法:\n1. Javaをインストールしてください（https://www.java.com/）\n2. JAVA_HOME環境変数を設定してください\n3. PATHにjavaコマンドが含まれているか確認してください\n4. macOSの場合、ターミナルから以下のコマンドでJavaの場所を確認できます:\n   /usr/libexec/java_home -V");
}

/// PlantUML JARファイルのパスを取得
fn get_plantuml_jar_path(app_handle: &AppHandle) -> Result<PathBuf> {
    // 1. リソースディレクトリからplantuml.jarを探す（本番環境で最も重要）
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        eprintln!("🔍 [PlantUML] リソースディレクトリを確認: {}", resource_dir.display());
        
        // 1-1. 直接リソースディレクトリ内を確認
        let jar_path = resource_dir.join("plantuml.jar");
        eprintln!("🔍 [PlantUML] JARパスを確認: {}", jar_path.display());
        if jar_path.exists() {
            eprintln!("✅ [PlantUML] JARファイルが見つかりました: {}", jar_path.display());
            return Ok(jar_path);
        }
        
        // 1-2. resourcesサブディレクトリ内を確認（tauri.conf.jsonでresources/plantuml.jarと指定した場合）
        let jar_path = resource_dir.join("resources").join("plantuml.jar");
        eprintln!("🔍 [PlantUML] resourcesサブディレクトリのJARパスを確認: {}", jar_path.display());
        if jar_path.exists() {
            eprintln!("✅ [PlantUML] resourcesサブディレクトリからJARファイルが見つかりました: {}", jar_path.display());
            return Ok(jar_path);
        }
        
        eprintln!("⚠️ [PlantUML] JARファイルが見つかりませんでした");
        // リソースディレクトリ内のファイル一覧を確認（デバッグ用）
        if let Ok(entries) = std::fs::read_dir(&resource_dir) {
            eprintln!("📁 [PlantUML] リソースディレクトリの内容:");
            for entry in entries.flatten() {
                eprintln!("   - {}", entry.path().display());
            }
        }
    } else {
        eprintln!("⚠️ [PlantUML] リソースディレクトリの取得に失敗しました");
    }
    
    // 2. アプリのデータディレクトリを確認
    if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
        let jar_path = app_data_dir.join("plantuml.jar");
        if jar_path.exists() {
            eprintln!("✅ [PlantUML] アプリデータディレクトリからJARファイルが見つかりました: {}", jar_path.display());
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
            eprintln!("✅ [PlantUML] 開発環境からJARファイルが見つかりました: {}", path.display());
            return Ok(path);
        }
    }
    
    // 4. 実行ファイルのディレクトリを確認（macOSアプリバンドルの場合）
    if let Ok(exe_path) = std::env::current_exe() {
        eprintln!("🔍 [PlantUML] 実行ファイルのパス: {}", exe_path.display());
        if let Some(exe_dir) = exe_path.parent() {
            // macOSアプリバンドルの場合、Contents/Resources/を確認
            #[cfg(target_os = "macos")]
            {
                // MissionAI.app/Contents/Resources/plantuml.jar
                if let Some(contents_dir) = exe_dir.parent() {
                    if let Some(_app_dir) = contents_dir.parent() {
                        let resources_dir = contents_dir.join("Resources");
                        let jar_path = resources_dir.join("plantuml.jar");
                        eprintln!("🔍 [PlantUML] macOSアプリバンドルのリソースパスを確認: {}", jar_path.display());
                        if jar_path.exists() {
                            eprintln!("✅ [PlantUML] macOSアプリバンドルからJARファイルが見つかりました: {}", jar_path.display());
                            return Ok(jar_path);
                        }
                    }
                }
            }
            
            let jar_path = exe_dir.join("plantuml.jar");
            if jar_path.exists() {
                eprintln!("✅ [PlantUML] 実行ファイルディレクトリからJARファイルが見つかりました: {}", jar_path.display());
                return Ok(jar_path);
            }
            // resourcesサブディレクトリも確認
            let jar_path = exe_dir.join("resources").join("plantuml.jar");
            if jar_path.exists() {
                eprintln!("✅ [PlantUML] 実行ファイルディレクトリのresourcesサブディレクトリからJARファイルが見つかりました: {}", jar_path.display());
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
