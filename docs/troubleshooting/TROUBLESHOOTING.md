# 総合トラブルシューティングガイド

> **📋 ステータス**: アクティブ（トラブルシューティングガイド）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: よくある問題と解決方法、デバッグ手順

## 概要

このガイドでは、MissionAIアプリケーションで発生する可能性のある問題とその解決方法を説明します。問題が発生した場合、このガイドを参照して解決を試みてください。

---

## ログの確認方法

### 開発環境

開発環境では、以下のログが標準エラー出力に表示されます：

```bash
# Tauriアプリ起動時のログ
✅ 環境変数ファイル（local.env）を読み込みました
✅ データベース初期化が完了しました
✅ 書き込みワーカーを起動しました
✅ ChromaDB Serverの初期化が完了しました
✅ APIサーバーが正常に起動しました
```

### 本番環境

本番環境では、ログはアプリケーションの標準エラー出力に出力されます。

**macOS**: コンソールアプリで確認可能
**Windows**: イベントビューアーで確認可能

---

## よくある問題と解決方法

### アプリケーション起動関連

#### 問題: アプリケーションが起動しない

**症状**: アプリケーションを起動しても何も表示されない

**確認事項**:
1. ログを確認してエラーメッセージを確認
2. 必要なポートが使用可能か確認
3. データベースファイルの権限を確認

**解決方法**:
```bash
# ポートの確認
lsof -i :3011  # macOS/Linux
netstat -ano | findstr :3011  # Windows

# データベースディレクトリの権限確認
ls -la ~/Library/Application\ Support/com.missionai.app/mission-ai-local/  # macOS
```

#### 問題: ポートが既に使用されている

**症状**: `Address already in use`エラー

**解決方法**:
1. 使用中のポートを確認
2. プロセスを終了するか、別のポートを指定

```bash
# macOS/Linux
lsof -i :3011
kill -9 <PID>

# Windows
netstat -ano | findstr :3011
taskkill /PID <PID> /F

# または環境変数で別のポートを指定
export API_SERVER_PORT=3012
```

---

### データベース関連

#### 問題: データベースが初期化されない

**症状**: `データベース初期化に失敗しました`エラー

**確認事項**:
1. アプリケーションデータディレクトリの権限
2. ディスク容量
3. ログのエラーメッセージ

**解決方法**:
```bash
# ディレクトリの権限確認と修正（macOS/Linux）
chmod 755 ~/Library/Application\ Support/com.missionai.app/mission-ai-local/

# ディスク容量の確認
df -h  # macOS/Linux
```

#### 問題: データベースファイルが見つからない

**症状**: `データベースファイルが見つかりません`エラー

**解決方法**:
1. アプリケーションを再起動（自動的に作成される）
2. データベースディレクトリを手動で作成

```bash
# macOS
mkdir -p ~/Library/Application\ Support/com.missionai.app/mission-ai-local/

# Windows
mkdir %APPDATA%\com.missionai.app\mission-ai-local\
```

#### 問題: データベースがロックされている

**症状**: `database is locked`エラー

**解決方法**:
1. アプリケーションを完全に終了
2. WALファイルを確認

```bash
# WALファイルの確認
ls -la ~/Library/Application\ Support/com.missionai.app/mission-ai-local-dev/*.wal
```

---

### ChromaDB関連

#### 問題: ChromaDB Serverが起動しない

**症状**: `ChromaDB Serverの初期化に失敗しました`警告

**確認事項**:
1. ChromaDBがインストールされているか
2. ポート8000が使用可能か
3. Python環境が正しく設定されているか

**解決方法**:
```bash
# ChromaDBのインストール確認
chroma --version  # または
python -m chromadb --version

# ポートの確認
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# 環境変数で別のポートを指定
export CHROMADB_PORT=8001
```

**注意**: ChromaDBが起動しない場合、SQLiteフォールバックが使用されます（正常動作）

#### 問題: ChromaDB検索が動作しない

**症状**: 検索結果が0件になる

**確認事項**:
1. ChromaDB Serverが起動しているか
2. データがChromaDBに保存されているか
3. コレクションが正しく作成されているか

**解決方法**:
1. ChromaDB Serverのログを確認
2. データの再同期を実行
3. [RAG検索のトラブルシューティング](../rag-search/RAG_SEARCH_TROUBLESHOOTING.md)を参照

---

### APIサーバー関連

#### 問題: APIサーバーが起動しない

**症状**: `APIサーバーの起動に失敗しました`エラー

**確認事項**:
1. ポート3011が使用可能か
2. データベースが初期化されているか
3. ログのエラーメッセージ

**解決方法**:
```bash
# ポートの確認
lsof -i :3011  # macOS/Linux
netstat -ano | findstr :3011  # Windows

# 環境変数で別のポートを指定
export API_SERVER_PORT=3012
```

#### 問題: フロントエンドからAPIに接続できない

**症状**: `Failed to fetch`エラー、APIリクエストが失敗する

**確認事項**:
1. APIサーバーが起動しているか
2. ポート番号が正しいか
3. CORS設定が正しいか

**解決方法**:
1. APIサーバーのヘルスチェック

```bash
curl http://localhost:3011/health
```

2. 環境変数`NEXT_PUBLIC_API_SERVER_PORT`が正しく設定されているか確認

---

### 環境変数関連

#### 問題: 環境変数が読み込まれない

**症状**: 環境変数の値が反映されない

**確認事項**:
1. ファイル名が正しいか（`local.env`または`.env`）
2. ファイルがプロジェクトルートにあるか
3. 環境変数の形式が正しいか

**解決方法**:
```bash
# ファイルの確認
cat local.env

# 形式の確認（KEY=value形式）
API_SERVER_PORT=3011
CHROMADB_PORT=8000
```

#### 問題: フロントエンドで環境変数が使えない

**症状**: `process.env.NEXT_PUBLIC_*`が`undefined`

**確認事項**:
1. `NEXT_PUBLIC_`プレフィックスがあるか
2. Next.jsを再ビルドしたか

**解決方法**:
1. 環境変数名に`NEXT_PUBLIC_`プレフィックスを追加
2. Next.jsを再ビルド

```bash
npm run build
```

---

### ビルド関連

#### 問題: ビルドが失敗する

**症状**: `cargo build`または`npm run build`が失敗する

**確認事項**:
1. エラーメッセージの内容
2. 依存関係が正しくインストールされているか
3. Rustツールチェーンが正しくインストールされているか

**解決方法**:
```bash
# 依存関係の再インストール
npm install
cd src-tauri
cargo clean
cargo build
```

#### 問題: ビルド時間が長い

**症状**: ビルドに非常に時間がかかる

**解決方法**:
1. 初回ビルドは時間がかかる（正常）
2. 並列ビルドを有効化

```bash
cargo build -j $(sysctl -n hw.ncpu)  # macOS
cargo build -j %NUMBER_OF_PROCESSORS%  # Windows
```

---

### パフォーマンス関連

#### 問題: アプリケーションが重い

**症状**: アプリケーションの動作が遅い

**確認事項**:
1. データベースのサイズ
2. ChromaDBのメモリ使用量
3. ログの確認

**解決方法**:
1. データベースの最適化

```sql
-- SQLiteの最適化
VACUUM;
ANALYZE;
```

2. ChromaDBの再起動
3. [スケーラビリティ分析](../scalability/SCALABILITY_ANALYSIS.md)を参照

---

## デバッグ手順

### 1. ログの確認

開発環境では、標準エラー出力にログが表示されます。本番環境では、ログファイルまたはシステムログを確認してください。

### 2. データベースの確認

```bash
# SQLiteデータベースの確認
sqlite3 ~/Library/Application\ Support/com.missionai.app/mission-ai-local-dev/app.db

# テーブル一覧
.tables

# データの確認
SELECT * FROM organizations LIMIT 10;
```

### 3. APIサーバーの確認

```bash
# ヘルスチェック
curl http://localhost:3011/health

# 組織一覧の取得
curl http://localhost:3011/api/organizations
```

### 4. ChromaDBの確認

```bash
# ChromaDB Serverの確認
curl http://localhost:8000/api/v1/heartbeat

# コレクション一覧の確認（Pythonスクリプト経由）
python -c "import chromadb; client = chromadb.Client(); print(client.list_collections())"
```

---

## エラーメッセージ一覧

### データベースエラー

| エラーメッセージ | 原因 | 解決方法 |
|----------------|------|---------|
| `database is locked` | データベースがロックされている | アプリケーションを再起動 |
| `no such table` | テーブルが存在しない | データベースを再初期化 |
| `disk I/O error` | ディスクエラー | ディスク容量と権限を確認 |

### APIエラー

| エラーメッセージ | 原因 | 解決方法 |
|----------------|------|---------|
| `Address already in use` | ポートが使用中 | 別のポートを指定 |
| `Connection refused` | APIサーバーが起動していない | APIサーバーを起動 |
| `Failed to fetch` | ネットワークエラー | ポート番号とCORS設定を確認 |

### ChromaDBエラー

| エラーメッセージ | 原因 | 解決方法 |
|----------------|------|---------|
| `ChromaDB Serverの初期化に失敗しました` | ChromaDBがインストールされていない | ChromaDBをインストール、またはSQLiteフォールバックを使用 |
| `Connection refused` | ChromaDB Serverが起動していない | ChromaDB Serverを起動 |

---

## サポート

問題が解決しない場合、以下の情報を含めて報告してください：

1. **エラーメッセージ**: 完全なエラーメッセージ
2. **ログ**: 関連するログの出力
3. **環境情報**:
   - OSとバージョン
   - Node.jsバージョン
   - Rustバージョン
   - アプリケーションバージョン
4. **再現手順**: 問題を再現する手順

---

## 関連ドキュメント

- [RAG検索のトラブルシューティング](../rag-search/RAG_SEARCH_TROUBLESHOOTING.md)
- [検索結果が0件になる理由](../rag-search/WHY_SEARCH_RESULTS_ZERO.md)
- [ポート設計の懸念点と解決策](../architecture/port-design-concerns.md)
- [環境変数](../environment/ENVIRONMENT_VARIABLES.md)
- [ビルド・デプロイ](../deployment/BUILD_AND_DEPLOYMENT.md)

---

最終更新: 2025-12-11
