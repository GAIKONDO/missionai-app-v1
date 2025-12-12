# 環境変数一覧

> **📋 ステータス**: アクティブ（環境変数仕様書）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: プロジェクトで使用する環境変数の一覧、説明、設定方法

## 概要

このプロジェクトでは、開発環境と本番環境で異なる環境変数の読み込み方法を使用しています。環境変数は、サーバーポート設定、AI API設定、その他の設定に使用されます。

## 環境変数の読み込み順序

### 開発環境（Rust側）

1. **`local.env`**（優先）
2. **`.env`**（フォールバック）
3. **システム環境変数**

**実装**: `src-tauri/src/main.rs`で`dotenv`を使用

### 本番環境（Rust側）

- 環境変数ファイルは読み込まれません
- システム環境変数から直接読み込み

### フロントエンド側（Next.js）

1. **`.env.local`**（優先、Gitにコミットされない）
2. **`.env`**（フォールバック）
3. **システム環境変数**

**注意**: 
- `NEXT_PUBLIC_`プレフィックス付きの環境変数のみがクライアント側に埋め込まれる
- ビルド時に固定されるため、実行時に変更できない
- `local.env`はRust側専用で、フロントエンド側では使用されない

## 環境変数一覧

### サーバーポート設定

#### `API_SERVER_PORT`

- **用途**: Rust APIサーバーのポート番号
- **デフォルト値**: `3011`
- **使用箇所**: `src-tauri/src/main.rs`
- **設定方法**:
  ```bash
  # 開発環境（local.env または .env）
  API_SERVER_PORT=3011
  
  # 本番環境（システム環境変数）
  export API_SERVER_PORT=3011
  ```
- **注意**: 開発環境ではNext.js開発サーバーとAPIサーバーは同じ3010を使用、本番環境ではAPIサーバーは3011を使用

#### `CHROMADB_PORT`

- **用途**: ChromaDB Serverのポート番号
- **デフォルト値**: `8000`
- **使用箇所**: `src-tauri/src/database/mod.rs`
- **設定方法**:
  ```bash
  # 開発環境（local.env または .env）
  CHROMADB_PORT=8000
  
  # 本番環境（システム環境変数）
  export CHROMADB_PORT=8000
  ```

#### `NEXT_PUBLIC_API_SERVER_PORT`

- **用途**: フロントエンドからRust APIサーバーに接続する際のポート番号
- **デフォルト値**: `3011`
- **使用箇所**: `lib/apiClient.ts`
- **設定方法**:
  ```bash
  # 開発環境（.env.local または .env）
  # 注意: local.envではなく、.env.localまたは.envを使用
  NEXT_PUBLIC_API_SERVER_PORT=3011
  ```
- **注意**: 
  - `NEXT_PUBLIC_`プレフィックスが必要（Next.jsのビルド時に埋め込まれる）
  - フロントエンド側の環境変数は`.env.local`または`.env`に設定（`local.env`はRust側専用）

---

### AI API設定（Rust側）

#### `OPENAI_API_KEY`

- **用途**: OpenAI APIキー
- **デフォルト値**: なし（必須）
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`
- **設定方法**:
  ```bash
  # 開発環境（local.env または .env）
  OPENAI_API_KEY=sk-...
  
  # 本番環境（システム環境変数）
  export OPENAI_API_KEY=sk-...
  ```
- **優先順位**: 環境変数 > データベース設定

#### `OPENAI_BASE_URL`

- **用途**: OpenAI APIのベースURL（カスタムエンドポイント用）
- **デフォルト値**: なし（OpenAI公式APIを使用）
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`
- **設定方法**:
  ```bash
  OPENAI_BASE_URL=https://api.openai.com/v1
  ```

#### `OPENAI_MODEL`

- **用途**: OpenAIのデフォルトモデル名
- **デフォルト値**: `gpt-4o-mini`
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`
- **設定方法**:
  ```bash
  OPENAI_MODEL=gpt-4o-mini
  ```

#### `ANTHROPIC_API_KEY`

- **用途**: Anthropic APIキー
- **デフォルト値**: なし
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`
- **設定方法**:
  ```bash
  ANTHROPIC_API_KEY=sk-ant-...
  ```

#### `ANTHROPIC_BASE_URL`

- **用途**: Anthropic APIのベースURL
- **デフォルト値**: なし
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`

#### `ANTHROPIC_MODEL`

- **用途**: Anthropicのデフォルトモデル名
- **デフォルト値**: `claude-3-5-sonnet-20241022`
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`

#### `OLLAMA_API_KEY`

- **用途**: Ollama APIキー（通常は不要）
- **デフォルト値**: なし
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`

#### `OLLAMA_BASE_URL`

- **用途**: Ollama APIのベースURL
- **デフォルト値**: なし
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`

#### `OLLAMA_MODEL`

- **用途**: Ollamaのデフォルトモデル名
- **デフォルト値**: `llama3.2`
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`

#### `LMSTUDIO_API_KEY`

- **用途**: LM Studio APIキー（通常は不要）
- **デフォルト値**: なし
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`

#### `LMSTUDIO_BASE_URL`

- **用途**: LM Studio APIのベースURL
- **デフォルト値**: なし
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`

#### `LMSTUDIO_MODEL`

- **用途**: LM Studioのデフォルトモデル名
- **デフォルト値**: `local-model`
- **使用箇所**: `src-tauri/src/database/ai_settings.rs`

---

### AI API設定（フロントエンド側）

#### `NEXT_PUBLIC_EMBEDDING_PROVIDER`

- **用途**: 埋め込み生成に使用するプロバイダー
- **デフォルト値**: `openai`
- **使用箇所**: `lib/embeddings.ts`
- **設定方法**:
  ```bash
  # 開発環境（.env.local または .env）
  # 注意: local.envではなく、.env.localまたは.envを使用
  NEXT_PUBLIC_EMBEDDING_PROVIDER=openai
  # または
  NEXT_PUBLIC_EMBEDDING_PROVIDER=ollama
  ```
- **有効な値**: `openai`, `ollama`
- **注意**: フロントエンド側の環境変数は`.env.local`または`.env`に設定（`local.env`はRust側専用）

#### `NEXT_PUBLIC_OPENAI_API_KEY`

- **用途**: フロントエンドからOpenAI APIを直接呼び出す際のAPIキー
- **デフォルト値**: なし
- **使用箇所**: `lib/embeddings.ts`（フロントエンド側の埋め込み生成）
- **設定方法**:
  ```bash
  # 開発環境（.env.local または .env）
  # 注意: local.envではなく、.env.localまたは.envを使用
  NEXT_PUBLIC_OPENAI_API_KEY=sk-...
  ```
- **注意**: 
  - `NEXT_PUBLIC_`プレフィックスが必要（Next.jsのビルド時に埋め込まれる）
  - フロントエンド側の環境変数は`.env.local`または`.env`に設定（`local.env`はRust側専用）

#### `NEXT_PUBLIC_OLLAMA_API_URL`

- **用途**: Ollama APIのエンドポイントURL
- **デフォルト値**: `http://localhost:11434/api/embeddings`
- **使用箇所**: `lib/embeddings.ts`
- **設定方法**:
  ```bash
  # 開発環境（.env.local または .env）
  # 注意: local.envではなく、.env.localまたは.envを使用
  NEXT_PUBLIC_OLLAMA_API_URL=http://localhost:11434/api/embeddings
  ```
- **注意**: フロントエンド側の環境変数は`.env.local`または`.env`に設定（`local.env`はRust側専用）

---

## 環境変数ファイルの例

### 開発環境用（Rust側: `local.env`）

```bash
# サーバーポート設定
API_SERVER_PORT=3011
CHROMADB_PORT=8000

# OpenAI設定
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini

# Anthropic設定（オプション）
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Ollama設定（オプション）
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### 開発環境用（フロントエンド側: `.env.local`）

```bash
# サーバーポート設定
NEXT_PUBLIC_API_SERVER_PORT=3011

# フロントエンド用埋め込み設定
NEXT_PUBLIC_EMBEDDING_PROVIDER=openai
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-api-key-here
NEXT_PUBLIC_OLLAMA_API_URL=http://localhost:11434/api/embeddings
```

**注意**: 
- Rust側の環境変数は`local.env`に設定
- フロントエンド側の環境変数は`.env.local`に設定（`NEXT_PUBLIC_`プレフィックスが必要）
- 両方のファイルを`.gitignore`に追加することを推奨

### 本番環境用（システム環境変数）

```bash
# macOS/Linux
export API_SERVER_PORT=3011
export CHROMADB_PORT=8000
export OPENAI_API_KEY=sk-your-api-key-here

# Windows (PowerShell)
$env:API_SERVER_PORT="3011"
$env:CHROMADB_PORT="8000"
$env:OPENAI_API_KEY="sk-your-api-key-here"
```

---

## セキュリティ注意事項

### APIキーの管理

⚠️ **重要**: APIキーは機密情報です。以下の点に注意してください。

1. **`.gitignore`に追加**: 環境変数ファイル（`.env`, `local.env`）をGitにコミットしない
2. **デフォルト値の使用**: 本番環境では環境変数から読み込む（ハードコードしない）
3. **権限の制限**: APIキーに最小限の権限を設定
4. **定期的なローテーション**: セキュリティのため、定期的にAPIキーを更新

### 環境変数ファイルの`.gitignore`設定

```gitignore
# 環境変数ファイル
.env
.env.local
.env.*.local
local.env
```

---

## トラブルシューティング

### 環境変数が読み込まれない

**原因**: ファイル名が間違っている、または読み込み順序の問題

**解決方法**:
1. **Rust側の場合**:
   - `local.env`ファイルがプロジェクトルートに存在するか確認
   - ファイル名が正確か確認（`.env.local`ではなく`local.env`）
   - Rust側のログを確認（開発環境では環境変数ファイルの読み込みログが表示される）
2. **フロントエンド側の場合**:
   - `.env.local`または`.env`ファイルがプロジェクトルートに存在するか確認
   - `NEXT_PUBLIC_`プレフィックスが付いているか確認
   - Next.jsを再起動（環境変数の変更は再起動が必要）

### フロントエンドで環境変数が使えない

**原因**: 
- `NEXT_PUBLIC_`プレフィックスがない
- 環境変数ファイルの場所が間違っている（`local.env`ではなく`.env.local`または`.env`）
- Next.jsを再起動していない

**解決方法**:
1. 環境変数名に`NEXT_PUBLIC_`プレフィックスを追加
2. `.env.local`または`.env`ファイルに設定（`local.env`はRust側専用）
3. Next.js開発サーバーを再起動（`npm run dev`）
4. 本番ビルドの場合は再ビルド（`npm run build`）

### ポート番号の競合

**原因**: 指定したポートが既に使用されている

**解決方法**:
1. 別のポート番号を指定
2. 使用中のポートを確認してプロセスを終了

```bash
# macOS/Linux
lsof -i :3011
kill -9 <PID>

# Windows
netstat -ano | findstr :3011
taskkill /PID <PID> /F
```

---

## 関連ドキュメント

- [ポート設計とサーバー構成](../architecture/port-and-server-design.md)
- [Rust/Tauri設定](../rust/RUST_TAURI_CONFIGURATION.md)
- [React設定](../react/REACT_CONFIGURATION.md)
- [セキュリティ](../security/SECURITY.md)

---

---

## 補足: 環境変数ファイルの使い分け

### Rust側（`local.env`）
- Rust APIサーバーとChromaDB Serverの設定
- AI API設定（OpenAI、Anthropic、Ollama、LM Studio）
- **注意**: `NEXT_PUBLIC_`プレフィックス付きの環境変数は使用しない

### フロントエンド側（`.env.local`または`.env`）
- Next.jsアプリケーションの設定
- `NEXT_PUBLIC_`プレフィックス付きの環境変数のみがクライアント側に埋め込まれる
- **注意**: `local.env`は使用しない（Rust側専用）

### 両方で使用する場合
同じ環境変数（例: `OPENAI_API_KEY`）をRust側とフロントエンド側の両方で使用する場合:
- Rust側: `local.env`に`OPENAI_API_KEY=sk-...`を設定
- フロントエンド側: `.env.local`に`NEXT_PUBLIC_OPENAI_API_KEY=sk-...`を設定

---

最終更新: 2025-12-11
