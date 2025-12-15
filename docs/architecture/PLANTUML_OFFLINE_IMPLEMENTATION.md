# PlantUMLオフライン実装の詳細設計

## 1. 概要

機密データを含むPlantUML図を安全に処理するため、外部サーバーに依存しないオフライン実装を検討する。

## 2. 現在の実装状況

### 2.1 現在のアーキテクチャ
- **エンコード**: `plantuml-encoder` (npmパッケージ) - アプリに含まれる
- **実行**: 外部サーバー (`https://www.plantuml.com/plantuml`) - インターネット接続必須
- **セキュリティ**: HTTPS通信だが、データが外部に送信される

### 2.2 現在のアプリサイズ（推定）
- **Rustバイナリ**: 約10-20MB（SQLite、ChromaDB統合含む）
- **フロントエンド**: 約5-10MB（Next.jsビルド成果物）
- **その他**: アイコン、リソースファイル等
- **合計**: 約20-40MB程度（プラットフォームによる）

## 3. オフライン実装のアプローチ

### 3.1 アプローチA: TauriバックエンドでPlantUMLを実行（推奨）

#### 3.1.1 アーキテクチャ
```
フロントエンド（React）
  ↓ PlantUMLコードを送信
Tauriコマンド（Rust）
  ↓ Javaプロセスを起動
PlantUML JARファイル
  ↓ SVG/PNGを生成
Tauriコマンド（Rust）
  ↓ 画像データを返す
フロントエンド（React）
  ↓ 表示
```

#### 3.1.2 必要なリソース

**PlantUML JARファイル**
- サイズ: 約11-21MB（バージョンによる）
- 最新版（1.2024.8）: 約20.9MB
- ダウンロード先: Maven Repository

**Java実行環境（JRE）**
- **オプション1: システムのJavaを使用**
  - サイズ増加: 0MB
  - 要件: ユーザーのPCにJavaがインストールされている必要
  - 検出方法: `java -version`コマンドで確認

- **オプション2: カスタムJREをバンドル**
  - サイズ増加: 約30-50MB（`jlink`で最適化した場合）
  - 標準JRE: 約91MB（非推奨）
  - メリット: Javaのインストール不要
  - デメリット: アプリサイズが大幅に増加

#### 3.1.3 実装詳細

**Rustバックエンド実装**
```rust
// src-tauri/src/commands/plantuml.rs

use std::process::Command;
use std::path::PathBuf;

#[tauri::command]
pub async fn render_plantuml(
    code: String,
    format: String, // "svg" or "png"
) -> Result<Vec<u8>, String> {
    // 1. Javaのパスを検出
    let java_path = detect_java()?;
    
    // 2. PlantUML JARファイルのパスを取得
    let jar_path = get_plantuml_jar_path()?;
    
    // 3. PlantUMLコードを一時ファイルに保存
    let temp_file = create_temp_file(&code)?;
    
    // 4. Javaプロセスを起動してPlantUMLを実行
    let output = Command::new(java_path)
        .arg("-jar")
        .arg(jar_path)
        .arg(&format!("-t{}", format))
        .arg(&temp_file)
        .output()
        .map_err(|e| format!("PlantUML実行エラー: {}", e))?;
    
    // 5. エラーチェック
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("PlantUMLエラー: {}", error));
    }
    
    // 6. 生成された画像データを返す
    Ok(output.stdout)
}
```

**PlantUML JARファイルの管理**
- **方法1: アプリにバンドル**
  - `src-tauri/resources/plantuml.jar`に配置
  - `tauri.conf.json`の`resources`に追加
  - サイズ増加: 約20MB

- **方法2: 初回起動時にダウンロード**
  - 初回起動時にMaven Repositoryからダウンロード
  - ローカルにキャッシュ
  - サイズ増加: 0MB（アプリ配布時）
  - デメリット: 初回起動時にインターネット接続が必要

**Javaの検出**
```rust
fn detect_java() -> Result<PathBuf, String> {
    // 1. JAVA_HOME環境変数を確認
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let java_path = PathBuf::from(java_home).join("bin").join("java");
        if java_path.exists() {
            return Ok(java_path);
        }
    }
    
    // 2. PATHからjavaコマンドを検索
    if let Ok(output) = Command::new("java").arg("-version").output() {
        if output.status.success() {
            return Ok(PathBuf::from("java")); // PATH上のjavaを使用
        }
    }
    
    Err("Javaが見つかりません。Javaをインストールしてください。".to_string())
}
```

#### 3.1.4 サイズ増加の見積もり

**最小構成（システムのJavaを使用）**
- PlantUML JAR: +20MB
- **合計サイズ増加**: 約20MB
- **最終サイズ**: 約40-60MB

**完全バンドル（カスタムJRE含む）**
- PlantUML JAR: +20MB
- カスタムJRE: +30-50MB
- **合計サイズ増加**: 約50-70MB
- **最終サイズ**: 約70-110MB

### 3.2 アプローチB: JavaScript/TypeScriptライブラリを使用

#### 3.2.1 アーキテクチャ
```
フロントエンド（React）
  ↓ PlantUMLコードを処理
JavaScriptライブラリ（ブラウザ内実行）
  ↓ SVG/PNGを生成
フロントエンド（React）
  ↓ 表示
```

#### 3.2.2 利用可能なライブラリ

**plantuml-parser**
- 機能: PlantUML構文のパースのみ
- サイズ: 小さい（数MB）
- 制限: レンダリング機能なし

**完全なクライアントサイドレンダリングライブラリ**
- 現状: 2024年時点で、完全にブラウザ内でPlantUMLをレンダリングする成熟したライブラリは限定的
- 課題: PlantUMLはJavaベースのため、JavaScriptへの移植が困難

#### 3.2.3 サイズ増加の見積もり
- ライブラリ: +5-10MB（存在する場合）
- **合計サイズ増加**: 約5-10MB
- **最終サイズ**: 約25-50MB
- **注意**: 完全な実装が存在しない可能性が高い

### 3.3 アプローチC: ハイブリッドアプローチ

#### 3.3.1 アーキテクチャ
- オフライン時: TauriバックエンドでPlantUMLを実行
- オンライン時: 外部サーバーを使用（オプション）
- ユーザーが選択可能

#### 3.3.2 メリット
- オフライン対応
- オンライン時は軽量（外部サーバー使用）
- ユーザーの選択肢を提供

#### 3.3.3 デメリット
- 実装が複雑
- 両方の実装を維持する必要がある

## 4. 推奨アプローチ

### 4.1 推奨: アプローチA（Tauriバックエンド + システムのJava）

**理由:**
1. **セキュリティ**: データが外部に送信されない
2. **オフライン対応**: 完全にオフラインで動作
3. **サイズ**: 最小構成で約20MBの増加のみ
4. **実装**: 確実に動作する実装が可能

**前提条件:**
- ユーザーのPCにJavaがインストールされている必要がある
- Javaの検出とエラーハンドリングが必要

### 4.2 代替案: アプローチA（完全バンドル）

**理由:**
- Javaのインストール不要
- ユーザー体験が向上

**デメリット:**
- アプリサイズが約50-70MB増加
- 最終サイズが約70-110MBになる

## 5. 実装計画

### 5.1 フェーズ1: 基本実装
1. RustバックエンドにPlantUML実行機能を追加
2. PlantUML JARファイルをアプリにバンドル
3. Javaの検出機能を実装
4. Tauriコマンドを作成

### 5.2 フェーズ2: フロントエンド統合
1. `PlantUMLDiagram`コンポーネントを修正
2. Tauriコマンドを呼び出すように変更
3. エラーハンドリングを改善

### 5.3 フェーズ3: 最適化
1. PlantUML JARファイルの遅延読み込み
2. エラーメッセージの改善
3. パフォーマンスの最適化

## 6. リスクと対策

### 6.1 リスク1: Javaがインストールされていない
**対策:**
- インストールガイドを提供
- エラーメッセージでJavaのインストールを促す
- オプションでJREをバンドル

### 6.2 リスク2: PlantUMLの実行エラー
**対策:**
- 詳細なエラーメッセージを表示
- ログを出力してデバッグを容易にする
- フォールバック機能を実装

### 6.3 リスク3: アプリサイズの増加
**対策:**
- PlantUML JARファイルの遅延読み込み
- 不要な機能を除外したカスタムJREの使用
- 圧縮の活用

## 7. 結論

機密データを含む想定であれば、**アプローチA（Tauriバックエンド + システムのJava）**を推奨する。

- **サイズ増加**: 約20MB（最小構成）
- **セキュリティ**: 完全にオフライン、データが外部に送信されない
- **実装**: 確実に動作する実装が可能
- **要件**: ユーザーのPCにJavaが必要（またはJREをバンドル）
