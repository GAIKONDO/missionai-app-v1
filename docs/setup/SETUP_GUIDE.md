# 開発環境セットアップガイド

> **📋 ステータス**: アクティブ（セットアップガイド）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: 新規開発者向けの開発環境セットアップ手順

## 概要

このガイドでは、MissionAIプロジェクトの開発環境をセットアップする手順を説明します。このプロジェクトは**macOSで開発**し、**Windowsでビルド**する前提で設計されています。

## 前提条件

### 必要なソフトウェア

- **Node.js**: v20.0.0以上
- **Rust**: 最新の安定版（rustupでインストール）
- **Tauri CLI**: v2.0以上
- **ChromaDB**: Pythonパッケージまたは`chroma`コマンド
- **Git**: バージョン管理

### 推奨ツール

- **VS Code**: エディタ
- **Rust Analyzer**: Rust開発用拡張機能
- **ESLint**: JavaScript/TypeScriptのリント

---

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd app40_MissionAI
```

### 2. Node.jsのインストール

#### macOS

```bash
# Homebrewを使用
brew install node@20

# またはnvmを使用
nvm install 20
nvm use 20
```

#### Windows

1. [Node.js公式サイト](https://nodejs.org/)からインストーラーをダウンロード
2. インストーラーを実行してインストール

### 3. Rustのインストール

#### macOS / Linux

```bash
# rustupをインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 環境変数を読み込み
source $HOME/.cargo/env

# バージョン確認
rustc --version
cargo --version
```

#### Windows

1. [Rust公式サイト](https://www.rust-lang.org/tools/install)からインストーラーをダウンロード
2. インストーラーを実行してインストール
3. Visual Studio Build Toolsが必要な場合があります

### 4. Tauri CLIのインストール

```bash
cargo install tauri-cli
```

**推奨**: `cargo install tauri-cli`を使用してください。プロジェクトローカルでのインストール（`npm install -D @tauri-apps/cli`）は現在の`package.json`には含まれていません。

### 5. ChromaDBのインストール

ChromaDBはベクトル検索に必須です。Pythonパッケージとしてインストールしてください。

#### Python環境の確認

```bash
# Python 3.8-3.12が必要
python3 --version
```

#### ChromaDBのインストール

```bash
# pipを使用してインストール
pip3 install chromadb

# または、pipxを使用（推奨）
pipx install chromadb
```

#### インストール確認

```bash
# ChromaDBがインストールされているか確認
python3 -c "import chromadb; print(chromadb.__version__)"
```

#### ChromaDBコマンドの確認

アプリケーションは`chroma`コマンドまたは`chromadb`コマンドを使用してChromaDB Serverを起動します。インストール後、以下のコマンドで確認できます：

```bash
# chromaコマンドが利用可能か確認
which chroma

# chromadbコマンドが利用可能か確認
which chromadb

# コマンドが存在しない場合、PATHに追加する必要がある場合があります
```

**注意**: 
- ChromaDBがインストールされていない場合、ベクトル検索機能は使用できません（検索結果が0件になります）
- ChromaDBはベクトル検索に必須です（SQLiteフォールバックはありません）
- アプリケーション起動時にChromaDB Serverが自動的に起動します（ポート8000）
- Python 3.8-3.12が必要です
- 詳細は[ChromaDB統合計画](../chromadb/CHROMADB_INTEGRATION_PLAN.md)を参照してください

### 6. 依存関係のインストール

```bash
# フロントエンド依存関係
npm install

# Rust依存関係（自動的にインストールされる）
cd src-tauri
cargo build
cd ..
```

### 7. 環境変数の設定

#### 開発環境用ファイルの作成

**Rust側**: プロジェクトルートに`local.env`ファイルを作成：

```bash
# local.env（Rust側用）
API_SERVER_PORT=3011
CHROMADB_PORT=8000

# OpenAI設定（オプション）
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

**フロントエンド側**: プロジェクトルートに`.env.local`ファイルを作成：

```bash
# .env.local（フロントエンド側用）
NEXT_PUBLIC_API_SERVER_PORT=3011

# フロントエンド用埋め込み設定（オプション）
NEXT_PUBLIC_EMBEDDING_PROVIDER=openai
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-api-key-here
NEXT_PUBLIC_OLLAMA_API_URL=http://localhost:11434/api/embeddings
```

**重要**: 
- `local.env`と`.env.local`ファイルは`.gitignore`に追加されているため、Gitにコミットされません
- Rust側は`local.env`、フロントエンド側は`.env.local`を使用します
- 詳細は[環境変数](../environment/ENVIRONMENT_VARIABLES.md)を参照してください

### 8. 動作確認

#### 開発サーバーの起動

```bash
npm run tauri:dev
```

このコマンドは以下を実行します：
1. Next.js開発サーバーをポート3010で起動
2. Tauriアプリケーションを起動
3. ChromaDB Serverをポート8000で起動（可能な場合）
4. Rust APIサーバーをポート3011で起動

#### ビルドテスト

```bash
# Next.jsのビルド
npm run build

# Tauriアプリのビルド（時間がかかります）
npm run tauri:build
```

---

## 開発環境の確認

### ポートの確認

以下のポートが使用されていることを確認：

- **3010**: Next.js開発サーバー
- **3011**: Rust APIサーバー
- **8000**: ChromaDB Server（インストールされている場合）

### ログの確認

開発環境では、以下のログが表示されます：

```
🔧 APIサーバーポート: 3011 (環境変数: 未設定（デフォルト3011）)
🔧 ChromaDB Serverポート: 8000 (環境変数: 未設定（デフォルト8000）)
✅ データベース初期化が完了しました
✅ 書き込みワーカーを起動しました
🚀 ChromaDB Serverの起動を開始します...
   データディレクトリ: /path/to/chromadb
   ポート: 8000
   Pythonパス: python3
   ChromaDBバージョン: x.x.x
   ChromaDBコマンド: chroma
   ChromaDB Serverプロセスを起動しました (PID: xxxxx)
   ChromaDB Serverの起動を待機中...
✅ ChromaDB Serverが正常に起動しました (x秒後)
✅ ChromaDB Serverの初期化が完了しました
🚀 APIサーバーを起動中: http://127.0.0.1:3011
✅ APIサーバーが起動しました: http://127.0.0.1:3011
```

**注意**: ChromaDBの初期化に失敗した場合、以下のメッセージが表示されますが、**SQLiteフォールバックは使用されません**（ベクトル検索は機能しません）：

```
⚠️  ChromaDB Serverの初期化に失敗しました: [エラーメッセージ]
```

### ブラウザでの確認

開発環境では、Tauriウィンドウが自動的に開き、`http://localhost:3010`が表示されます。

---

## トラブルシューティング

### ポートが既に使用されている

**エラー**: `Address already in use`

**解決方法**:
1. 使用中のポートを確認
2. 環境変数で別のポートを指定

```bash
# macOS/Linux
lsof -i :3011
kill -9 <PID>

# Windows
netstat -ano | findstr :3011
taskkill /PID <PID> /F
```

### ChromaDBが起動しない

**エラー**: `ChromaDB Serverの初期化に失敗しました`

**解決方法**:
1. ChromaDBがインストールされているか確認
   ```bash
   python3 -c "import chromadb; print(chromadb.__version__)"
   ```
2. ポート8000が使用可能か確認
3. **重要**: ChromaDBが無効な場合、ベクトル検索機能は使用できません（検索結果が0件になります）
4. ChromaDBを有効化するには、設定ページで有効化するか、ブラウザのコンソールで以下を実行：
   ```javascript
   localStorage.setItem('useChromaDB', 'true')
   ```

### 環境変数が読み込まれない

**エラー**: 環境変数の値が反映されない

**解決方法**:
1. **Rust側の場合**:
   - `local.env`ファイルがプロジェクトルートに存在するか確認
   - ファイル名が正確か確認（`.env.local`ではなく`local.env`）
   - 環境変数の形式が正しいか確認（`KEY=value`形式）
2. **フロントエンド側の場合**:
   - `.env.local`ファイルがプロジェクトルートに存在するか確認
   - `NEXT_PUBLIC_`プレフィックスが付いているか確認（クライアント側に埋め込まれる変数のみ）
   - Next.js開発サーバーを再起動（環境変数の変更は再起動が必要）

### Rustビルドエラー

**エラー**: `cargo build`が失敗する

**解決方法**:
1. Rustが正しくインストールされているか確認
2. 必要なビルドツールがインストールされているか確認
3. `cargo clean`を実行して再ビルド

```bash
cd src-tauri
cargo clean
cargo build
```

### Node.js依存関係のエラー

**エラー**: `npm install`が失敗する

**解決方法**:
1. Node.jsのバージョンを確認（v20.0.0以上）
2. `node_modules`を削除して再インストール

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 次のステップ

開発環境のセットアップが完了したら、以下のドキュメントを参照してください：

1. **[開発ガイドライン](../development/DEVELOPMENT_GUIDELINES.md)** - 開発時の注意点とベストプラクティス
2. **[環境変数](../environment/ENVIRONMENT_VARIABLES.md)** - 環境変数の詳細な説明
3. **[アーキテクチャ設計](../architecture/port-and-server-design.md)** - システム全体の設計
4. **[API仕様](../rust/API_SPECIFICATION.md)** - APIエンドポイントの仕様

---

## 関連ドキュメント

- [環境変数](../environment/ENVIRONMENT_VARIABLES.md) - 環境変数の詳細な設定方法
- [開発ガイドライン](../development/DEVELOPMENT_GUIDELINES.md) - 開発時の注意点
- [ポート設計とサーバー構成](../architecture/port-and-server-design.md) - システム全体の設計
- [Rust/Tauri設定](../rust/RUST_TAURI_CONFIGURATION.md) - バックエンド設定
- [React設定](../react/REACT_CONFIGURATION.md) - フロントエンド設定

---

最終更新: 2025-12-11
