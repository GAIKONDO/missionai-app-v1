# ChromaDBのローカル利用について

> **⚠️ 注意**: このドキュメントは過去の検討内容を記録したものです。  
> **📋 ステータス**: 参考用（過去の検討内容）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: ChromaDB統合前の検討内容の記録  
> **🔴 重要**: 現在の実装では**ChromaDB Serverを使用**しています。このドキュメントで推奨されている`hnsw_rs`は採用されていません。  
> 現在の実装については [`CHROMADB_INTEGRATION_PLAN.md`](./CHROMADB_INTEGRATION_PLAN.md) を参照してください。

## 📊 ChromaDBの動作モード

### JavaScript/Node.js環境

#### ✅ **ローカルファイルベース（サーバー不要）**
```javascript
import { ChromaClient } from "chromadb";

// PersistentClient: ローカルファイルに保存（サーバー不要）
const client = new ChromaClient({ path: "./chroma_data" });
```

**特徴:**
- ✅ **サーバー不要** - ローカルファイルに直接保存
- ✅ **すぐに動作** - サーバー起動が不要
- ✅ **軽量** - 追加のプロセスが不要
- ✅ **データの永続化** - ローカルファイルに保存

**制約:**
- ❌ **Node.js環境でのみ動作** - ブラウザ環境（TauriのWebView内）では動作しない
- ❌ **TauriのWebViewでは使用不可** - 現在の実装ではエラーが発生

---

### Rust環境

#### ❌ **サーバー必須**
```rust
use chromadb::client::{ChromaClient, ChromaClientOptions};

// HTTP API経由でサーバーに接続（サーバー必須）
let client = ChromaClient::new(ChromaClientOptions {
    url: Some("http://localhost:8000".to_string()),
    database: "default".to_string(),
    auth: None,
});
```

**特徴:**
- ❌ **サーバー必須** - ChromaDBサーバーを別途起動する必要がある
- ❌ **すぐに動作しない** - サーバー起動に数秒かかる
- 🔴 **メモリ使用量が高い** - Python + ChromaDBサーバーで約250-400MB

---

## 🎯 現在の実装状況

### JavaScript側の実装

```typescript
// lib/chromaClient.ts
const client = new ChromaClient({
  path: chromaDbPath, // ローカルファイルパス
});
```

**問題点:**
- ChromaDBのJavaScriptクライアントは**Node.js環境向け**に設計されている
- **TauriのWebView（ブラウザ環境）では動作しない**
- エラー: `Loading chunk _app-pages-browser_lib_chromaClient_ts failed`

**結果:**
- ❌ 現在は動作しない
- ✅ SQLite/Firestoreフォールバックが自動的に使用される

---

## 💡 解決策の選択肢

### 選択肢1: ChromaDBサーバーを起動（Rust側）

#### 実装方法
1. ChromaDBサーバーをPythonで起動（バックグラウンドプロセス）
2. Rust側からHTTP API経由で接続

#### メリット
- ChromaDBの機能をフルに活用できる

#### デメリット
- ❌ **サーバー常駐が必要**
- ❌ すぐに動作しない（サーバー起動に3-5秒）
- ❌ メモリ使用量が高い（250-400MB）
- ❌ Python環境が必要

---

### 選択肢2: Rustネイティブのベクトル検索ライブラリ（推奨）

#### 実装方法
1. `hnsw_rs`などのRustネイティブライブラリを使用
2. ローカルファイルに保存

#### メリット
- ✅ **サーバー不要** - 埋め込みモードで動作
- ✅ **すぐに動作** - アプリケーション起動と同時に動作
- ✅ **メモリ効率が良い** - 約60-120MB（ChromaDBの約1/3-1/4）
- ✅ **軽量** - 配布パッケージサイズが小さい（+15-30MB）

#### デメリット
- ⚠️ 実装が必要（16-24時間）

---

### 選択肢3: JavaScript側でChromaDBを使用（Node.js環境でのみ）

#### 実装方法
1. Tauriのコマンド経由でNode.jsプロセスを起動
2. Node.jsプロセス内でChromaDBを使用

#### メリット
- ChromaDBのPersistentClientを使用可能

#### デメリット
- ❌ **複雑な実装** - プロセス間通信が必要
- ❌ **パフォーマンスのオーバーヘッド** - プロセス間通信のコスト
- ❌ **エラーハンドリングが複雑**

---

## 📊 比較表

| 項目 | ChromaDBサーバー | ChromaDB PersistentClient（Node.js） | hnsw_rs（Rust） |
|------|-----------------|-----------------------------------|----------------|
| **サーバー常駐** | ❌ 必要 | ✅ 不要 | ✅ 不要 |
| **すぐに動作** | ❌ 3-5秒 | ✅ すぐ | ✅ すぐ |
| **メモリ使用量** | 🔴 250-400MB | 🟢 60-120MB | 🟢 60-120MB |
| **実装の複雑さ** | 🔴 複雑 | 🔴 複雑 | 🟢 中程度 |
| **エンドユーザー体験** | ❌ 使いづらい | ✅ 使いやすい | ✅ 使いやすい |

---

## 🎯 結論

### ChromaDBのローカル利用について

1. **JavaScript/Node.js環境では可能**
   - PersistentClientを使用してローカルファイルベースで動作
   - **サーバー不要**

2. **TauriのWebView内では不可能**
   - ChromaDBのJavaScriptクライアントはブラウザ環境では動作しない
   - 現在の実装ではエラーが発生

3. **Rust環境ではサーバー必須**
   - ChromaDBのRustクライアントはHTTP API経由のみ
   - **サーバー常駐が必要**

### 推奨

**Rustネイティブのベクトル検索ライブラリ（`hnsw_rs`）を使用**

**理由:**
- ✅ サーバー不要
- ✅ すぐに動作
- ✅ メモリ効率が良い
- ✅ エンドユーザーにとって使いやすい
