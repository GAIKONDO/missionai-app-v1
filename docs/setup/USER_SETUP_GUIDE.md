# MissionAI ユーザーセットアップガイド

> **📋 ステータス**: アクティブ（ユーザー向けセットアップガイド）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: DMGファイルからインストールしたユーザー向けのセットアップ手順

## 概要

このガイドでは、`MissionAI_2.1.2_aarch64.dmg`からインストールした後のセットアップ手順を説明します。

## インストール後の自動セットアップ

MissionAIは初回起動時に以下の処理を自動的に実行します：

### ✅ 自動で行われる処理

1. **データベースの初期化**
   - SQLiteデータベースが自動的に作成されます
   - データ保存先: `~/Library/Application Support/com.missionai.app/mission-ai-local/app.db`
   - 初回起動時に自動的にテーブルが作成されます

2. **アプリケーションデータディレクトリの作成**
   - アプリケーションデータは自動的に作成されます
   - 場所: `~/Library/Application Support/com.missionai.app/`

3. **APIサーバーの起動**
   - Rust APIサーバーが自動的に起動します（ポート3011）
   - ユーザーの操作は不要です

---

## 追加で必要なセットアップ

### ☕ Javaのセットアップ（PlantUML図のレンダリングに必要）

**重要**: PlantUML図をレンダリングする場合は、Javaのセットアップが必要です。Javaがインストールされていない場合、PlantUML図が表示されません。

#### 前提条件

- **Java 8以上**がインストールされている必要があります

#### セットアップ手順

1. **Javaのインストール確認**

```bash
# ターミナルでJavaのバージョンを確認
java -version

# macOSの場合、Javaの場所を確認
/usr/libexec/java_home -V
```

Javaがインストールされていない場合、以下の手順でインストールしてください。

2. **Javaのインストール（macOS）**

**方法1: Homebrewを使用（推奨）**

```bash
# HomebrewでOpenJDKをインストール
brew install openjdk@17

# または、最新版をインストール
brew install openjdk
```

**方法2: Oracle JDKをダウンロード**

1. [Oracle JDK公式サイト](https://www.oracle.com/java/technologies/downloads/)からダウンロード
2. インストーラーを実行してインストール

**方法3: Adoptium（Eclipse Temurin）を使用**

1. [Adoptium公式サイト](https://adoptium.net/)からダウンロード
2. インストーラーを実行してインストール

3. **JAVA_HOME環境変数の設定（オプション）**

通常は不要ですが、Javaが見つからない場合は設定してください：

```bash
# ~/.zshrc または ~/.bashrc に追加
export JAVA_HOME=$(/usr/libexec/java_home)
```

設定後、ターミナルを再起動するか、以下のコマンドを実行：

```bash
source ~/.zshrc  # zshの場合
# または
source ~/.bashrc  # bashの場合
```

4. **アプリケーションの再起動**

Javaをインストールした後、MissionAIアプリケーションを再起動してください。

#### Javaの動作確認

アプリケーション起動後、PlantUML図を表示して動作を確認してください。エラーが表示される場合、以下のトラブルシューティングを参照してください。

---

### 🔧 ChromaDBのセットアップ（ベクトル検索機能を使用する場合）

**重要**: ベクトル検索機能（RAG検索）を使用する場合は、ChromaDBのセットアップが必要です。ChromaDBがセットアップされていない場合、検索結果が0件になります。

#### 前提条件

- **Python 3.8-3.12**がインストールされている必要があります

#### セットアップ手順

1. **Python環境の確認**

```bash
# ターミナルでPythonのバージョンを確認
python3 --version
```

Python 3.8-3.12がインストールされていることを確認してください。

2. **ChromaDBのインストール**

```bash
# pipを使用してインストール
pip3 install chromadb

# または、pipxを使用（推奨）
pipx install chromadb
```

3. **インストール確認**

```bash
# ChromaDBがインストールされているか確認
python3 -c "import chromadb; print(chromadb.__version__)"

# chromaコマンドが利用可能か確認
which chroma
```

4. **アプリケーションの再起動**

ChromaDBをインストールした後、MissionAIアプリケーションを再起動してください。アプリケーション起動時にChromaDB Serverが自動的に起動します（ポート8000）。

#### ChromaDB Serverの動作確認

アプリケーション起動時に、以下のログが表示されれば正常に動作しています：

```
✅ ChromaDB Serverの初期化が完了しました
```

エラーが表示される場合：

```
❌ ChromaDB Serverの初期化に失敗しました
```

この場合、以下のトラブルシューティングを参照してください。

---

## 環境変数の設定（オプション）

### デフォルト設定

MissionAIは以下のデフォルト設定で動作します：

- **APIサーバーポート**: 3011
- **ChromaDB Serverポート**: 8000

### カスタム設定が必要な場合

ポート番号を変更する必要がある場合は、システム環境変数を設定してください。

#### macOS/Linux

```bash
# ~/.zshrc または ~/.bashrc に追加
export API_SERVER_PORT=3011
export CHROMADB_PORT=8000
```

設定後、ターミナルを再起動するか、以下のコマンドを実行：

```bash
source ~/.zshrc  # zshの場合
# または
source ~/.bashrc  # bashの場合
```

#### Windows (PowerShell)

```powershell
# システム環境変数として設定（永続的）
[System.Environment]::SetEnvironmentVariable("API_SERVER_PORT", "3011", "User")
[System.Environment]::SetEnvironmentVariable("CHROMADB_PORT", "8000", "User")
```

**注意**: 環境変数の設定は通常不要です。デフォルト設定で問題なく動作します。

---

## AI APIキーの設定（オプション）

### OpenAI APIキーの設定

AI機能を使用する場合は、アプリケーション内の設定画面からAPIキーを設定できます。

1. MissionAIアプリケーションを起動
2. 設定画面を開く
3. AI設定セクションでAPIキーを入力

**注意**: APIキーはデータベースに保存されます。環境変数から設定することも可能ですが、通常はアプリケーション内の設定画面から設定することを推奨します。

---

## 動作確認

### 1. アプリケーションの起動

MissionAIアプリケーションを起動してください。

### 2. データベースの確認

アプリケーションが正常に起動し、データベースが作成されていることを確認：

- データベースファイル: `~/Library/Application Support/com.missionai.app/mission-ai-local/app.db`

### 3. ChromaDB Serverの確認（ベクトル検索を使用する場合）

アプリケーション起動時に、ChromaDB Serverが正常に起動していることを確認：

- ログに「✅ ChromaDB Serverの初期化が完了しました」が表示される
- ポート8000が使用されている（`lsof -i :8000`で確認可能）

### 4. APIサーバーの確認

APIサーバーが正常に起動していることを確認：

- ポート3011が使用されている（`lsof -i :3011`で確認可能）

---

## トラブルシューティング

### PlantUML図がレンダリングできない

**症状**: 「Javaが見つかりません」というエラーが表示される

**解決方法**:

1. **Javaのインストール確認**
   ```bash
   java -version
   ```
   Javaがインストールされていない場合は、上記の「Javaのセットアップ」セクションを参照してインストールしてください

2. **macOSの場合、/usr/libexec/java_homeで確認**
   ```bash
   /usr/libexec/java_home -V
   ```
   複数のJavaバージョンがインストールされている場合、最新版が使用されます

3. **JAVA_HOME環境変数の確認**
   ```bash
   echo $JAVA_HOME
   ```
   設定されていない場合は、上記の「Javaのセットアップ」セクションを参照して設定してください

4. **アプリケーションの再起動**
   Javaをインストールまたは設定した後、MissionAIアプリケーションを完全に終了してから再起動してください

**注意**: GUIアプリケーションから起動した場合、シェルの環境変数（PATHなど）が継承されない場合があります。その場合でも、macOSの標準的なJava検出機能（`/usr/libexec/java_home`）を使用してJavaを検出します。

### ChromaDB Serverが起動しない

**症状**: アプリケーション起動時に「❌ ChromaDB Serverの初期化に失敗しました」が表示される

**解決方法**:

1. **Python環境の確認**
   ```bash
   python3 --version
   ```
   Python 3.8-3.12がインストールされていることを確認

2. **ChromaDBのインストール確認**
   ```bash
   python3 -c "import chromadb; print(chromadb.__version__)"
   ```
   ChromaDBがインストールされていない場合は、インストールしてください

3. **ポート8000の確認**
   ```bash
   lsof -i :8000
   ```
   ポート8000が既に使用されている場合は、別のプロセスを終了するか、環境変数でポート番号を変更してください

4. **ChromaDBコマンドの確認**
   ```bash
   which chroma
   which chromadb
   ```
   `chroma`または`chromadb`コマンドが利用可能か確認してください

### データベースが作成されない

**症状**: アプリケーションが起動しない、またはデータベースエラーが表示される

**解決方法**:

1. **アプリケーションデータディレクトリの確認**
   ```bash
   ls -la ~/Library/Application\ Support/com.missionai.app/
   ```
   ディレクトリが存在することを確認

2. **権限の確認**
   ```bash
   ls -la ~/Library/Application\ Support/com.missionai.app/mission-ai-local/
   ```
   書き込み権限があることを確認

3. **アプリケーションの再起動**
   アプリケーションを完全に終了してから再起動してください

### ポートが既に使用されている

**症状**: 「Address already in use」エラーが表示される

**解決方法**:

1. **使用中のポートを確認**
   ```bash
   # macOS/Linux
   lsof -i :3011  # APIサーバー
   lsof -i :8000  # ChromaDB Server
   ```

2. **プロセスを終了**
   ```bash
   kill -9 <PID>
   ```

3. **環境変数でポート番号を変更**
   別のポート番号を指定してください

---

## データの保存場所

### アプリケーションデータ

- **場所**: `~/Library/Application Support/com.missionai.app/`
- **内容**:
  - SQLiteデータベース: `mission-ai-local/app.db`
  - ChromaDBデータ: `chromadb/`（ChromaDBが有効な場合）
  - 画像ファイル: `mission-ai-local/images/`

### ログファイル

アプリケーションのログは標準出力に出力されます。ターミナルから起動した場合、ログが表示されます。

---

## 次のステップ

セットアップが完了したら、以下の機能を使用できます：

1. **データの登録**: 組織、企業、プロジェクトなどのデータを登録
2. **ベクトル検索**: ChromaDBがセットアップされている場合、RAG検索機能を使用可能
3. **AI機能**: APIキーを設定すると、AI機能を使用可能

---

## 関連ドキュメント

- [開発環境セットアップガイド](./SETUP_GUIDE.md) - 開発者向けセットアップガイド
- [トラブルシューティング](../troubleshooting/TROUBLESHOOTING.md) - よくある問題と解決方法
- [ChromaDB統合計画](../chromadb/CHROMADB_INTEGRATION_PLAN.md) - ChromaDBの詳細情報

---

最終更新: 2025-12-11

