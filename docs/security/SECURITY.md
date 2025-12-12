# セキュリティポリシー

> **📋 ステータス**: アクティブ（セキュリティポリシー）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: セキュリティ設定、APIキー管理、データ保護ポリシー

**注意**: このドキュメントは、ローカルデスクトップアプリケーション（Tauri）のセキュリティポリシーです。フロントエンド側では`localStorage`を使用してAPIキーを保存していますが、実際の暗号化は行われていません。

## 概要

このドキュメントでは、MissionAIアプリケーションのセキュリティ設定とベストプラクティスを説明します。デスクトップアプリケーションとして、ローカルデータの保護とAPIキーの安全な管理が重要です。

## CSP (Content Security Policy) 設定

### 本番環境 (`tauri.conf.json`)

```json
{
  "security": {
    "csp": "default-src 'self' tauri://localhost; connect-src 'self' tauri://localhost http://localhost:3011 http://127.0.0.1:3011 ws://localhost:* ws://127.0.0.1:* https://api.openai.com https://api.anthropic.com https://*.ollama.ai; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: file: tauri://localhost; font-src 'self' data: tauri://localhost;"
  }
}
```

### 開発環境 (`tauri.conf.dev.json`)

```json
{
  "security": {
    "csp": "default-src 'self' http://localhost:3010; connect-src 'self' http://localhost:3010 http://localhost:3011 http://127.0.0.1:3010 http://127.0.0.1:3011 ws://localhost:* ws://127.0.0.1:* https://api.openai.com https://api.anthropic.com https://*.ollama.ai; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3010; style-src 'self' 'unsafe-inline' http://localhost:3010; img-src 'self' data: https: file: http://localhost:3010; font-src 'self' data: http://localhost:3010;"
  }
}
```

### CSP設定の説明

#### `default-src 'self'`
- **本番**: `tauri://localhost`のみ許可
- **開発**: `http://localhost:3010`を許可
- **目的**: デフォルトで許可されるリソースの制限

#### `connect-src`
- **ローカル通信**: `http://localhost:3011`, `http://127.0.0.1:3011`を許可
- **WebSocket**: `ws://localhost:*`, `ws://127.0.0.1:*`を許可
- **AI API**: `https://api.openai.com`, `https://api.anthropic.com`, `https://*.ollama.ai`を許可
- **目的**: ネットワークリクエストの制限

#### `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
- **注意**: `unsafe-inline`と`unsafe-eval`は開発の利便性のため許可
- **推奨**: 本番環境では可能な限り制限を強化

#### `style-src 'self' 'unsafe-inline'`
- **目的**: インラインスタイルを許可（Next.jsの動作に必要）

#### `img-src 'self' data: https: file: tauri://localhost`
- **目的**: 画像リソースの読み込みを許可

#### `font-src 'self' data: tauri://localhost`
- **目的**: フォントリソースの読み込みを許可

---

## APIキー管理

### 保存場所

#### 環境変数（推奨）

**開発環境**:
- `local.env`ファイル（Gitにコミットしない）
- `.env`ファイル（Gitにコミットしない）

**本番環境**:
- システム環境変数
- 環境変数ファイルは使用しない

#### データベース（フォールバック）

- `aiSettings`テーブルに保存
- 環境変数が優先される

#### フロントエンド側（localStorage）

**保存場所**:
- `localStorage`に`api_key_{providerName}`形式で保存
- `lib/security.ts`の`saveAPIKey()`/`getAPIKey()`を使用

**実装詳細**:
- Base64エンコード（`btoa`/`atob`）による簡易エンコードのみ
- 実際の暗号化は行われていない
- `app/settings/page.tsx`で設定画面から保存可能

**注意**:
- `localStorage`はブラウザの開発者ツールからアクセス可能
- セキュリティが重要な場合は、OSのキーチェーン使用を推奨

### APIキーの暗号化

**現状**: APIキーは平文で保存されています

**保存場所別の状況**:
- **環境変数**: システム環境変数として平文で保存（OSの権限に依存）
- **データベース（`aiSettings`テーブル）**: 平文で保存
- **フロントエンド（`localStorage`）**: Base64エンコードのみ（暗号化なし）

**推奨改善**:
- データベースに保存する場合は暗号化を検討
- フロントエンド側では、OSのキーチェーン（macOS Keychain、Windows Credential Manager）の使用を検討
- または、Rust側のTauriコマンド経由でAPIキーを管理し、フロントエンド側には保存しない設計を検討

### APIキーの権限

**推奨**:
- 最小限の権限を持つAPIキーを使用
- 不要になったAPIキーは無効化
- 定期的なローテーション

---

## ローカル通信のセキュリティ

### APIサーバー

- **接続**: `http://localhost:3011`のみ
- **CORS**: すべてのオリジンを許可（ローカル環境のみ）
- **認証**: なし（ローカル環境のみ）

**注意**: 
- このアプリケーションはローカルデスクトップアプリケーションのため、本番環境でも`localhost`のみに接続
- CORS設定はローカル通信のみを想定しており、外部からのアクセスは想定していない
- 実装: `src-tauri/src/api/server.rs`で`CorsLayer::new().allow_origin(Any)`を使用

### ChromaDB Server

- **接続**: `http://localhost:8000`のみ
- **認証**: なし（ローカル環境のみ）

---

## データ保護

### データベースファイル

**保存場所**:
- **macOS**: `~/Library/Application Support/com.missionai.app/mission-ai-local/`
- **Windows**: `%APPDATA%\com.missionai.app\mission-ai-local\`

**保護**:
- OSのファイルシステム権限に依存
- 暗号化は実装されていない

**推奨改善**:
- 機密データの暗号化を検討
- SQLiteの暗号化拡張機能の使用を検討

### ChromaDBデータ

**保存場所**:
- `{app_data_dir}/chromadb/`

**保護**:
- OSのファイルシステム権限に依存
- 暗号化は実装されていない

---

## ネットワークセキュリティ

### 外部通信

**許可されている外部通信**:
- OpenAI API: `https://api.openai.com`
- Anthropic API: `https://api.anthropic.com`
- Ollama: `https://*.ollama.ai`（ローカルインスタンスの場合は`http://localhost:11434`）

**すべての通信**:
- HTTPSを使用（Ollamaのローカルインスタンスを除く）
- APIキーはHTTPヘッダーで送信

### ローカル通信

**許可されているローカル通信**:
- Rust API Server: `http://localhost:3011`
- ChromaDB Server: `http://localhost:8000`
- Next.js開発サーバー: `http://localhost:3010`（開発環境のみ）

**セキュリティ**:
- ローカルホストのみ許可
- 認証なし（ローカル環境のみ）

---

## セキュリティベストプラクティス

### 開発環境

1. **環境変数ファイルの管理**
   - `.gitignore`に追加
   - `local.env`を使用（個人設定用、Rust側）
   - `.env.local`を使用（フロントエンド側、`NEXT_PUBLIC_`プレフィックス付き）
   - APIキーをハードコードしない

2. **コードレビュー**
   - APIキーがコードに含まれていないか確認
   - 機密情報がログに出力されていないか確認
   - `localStorage`に保存されるAPIキーが適切に管理されているか確認

3. **依存関係の管理**
   - 定期的な更新
   - 脆弱性の確認

### 本番環境

1. **APIキーの管理**
   - システム環境変数から読み込み
   - 最小限の権限を持つAPIキーを使用
   - 定期的なローテーション

2. **データ保護**
   - ファイルシステム権限の確認
   - バックアップの暗号化

3. **ログ管理**
   - 機密情報をログに出力しない
   - ログファイルの保護

---

## セキュリティチェックリスト

### 開発時

- [ ] APIキーがコードにハードコードされていない
- [ ] 環境変数ファイル（`local.env`, `.env.local`）が`.gitignore`に追加されている
- [ ] 機密情報がログに出力されていない
- [ ] CSP設定が適切に設定されている
- [ ] フロントエンド側の`localStorage`に保存されるAPIキーが適切に管理されている

### リリース前

- [ ] すべてのAPIキーが環境変数から読み込まれている（Rust側）
- [ ] フロントエンド側のAPIキー管理（`localStorage`）が適切に実装されている
- [ ] デバッグ情報が削除されている
- [ ] 不要な依存関係が削除されている
- [ ] セキュリティアップデートが適用されている
- [ ] CSP設定が本番環境用に適切に設定されている（`tauri.conf.json`）

### 本番環境

- [ ] システム環境変数が正しく設定されている
- [ ] ファイルシステム権限が適切に設定されている
- [ ] バックアップが暗号化されている
- [ ] ログに機密情報が含まれていない

---

## 脆弱性の報告

セキュリティ脆弱性を発見した場合、以下の情報を含めて報告してください：

1. **脆弱性の説明**: 詳細な説明
2. **影響範囲**: 影響を受ける機能やデータ
3. **再現手順**: 脆弱性を再現する手順
4. **推奨される修正**: 修正方法の提案（可能な場合）

**報告方法**: セキュリティ担当者に直接連絡してください。

---

## 関連ドキュメント

- [環境変数](../environment/ENVIRONMENT_VARIABLES.md)
- [ポート設計とサーバー構成](../architecture/port-and-server-design.md)
- [Rust/Tauri設定](../rust/RUST_TAURI_CONFIGURATION.md)
- [React設定](../react/REACT_CONFIGURATION.md)

---

最終更新: 2025-12-11
