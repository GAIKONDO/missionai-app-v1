# ビルド・デプロイガイド

> **📋 ステータス**: アクティブ（ビルド・デプロイガイド）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: ビルド手順、デプロイ手順、配布パッケージ作成

## 概要

このガイドでは、MissionAIアプリケーションのビルドとデプロイ手順を説明します。このプロジェクトは**macOSで開発**し、**Windowsでビルド**する前提で設計されています。

## ビルド環境

### 開発環境（macOS）

- **OS**: macOS
- **用途**: 開発、テスト、デバッグ

### ビルド環境（Windows）

- **OS**: Windows
- **用途**: 本番ビルド、配布パッケージ作成

---

## ビルド手順

### 開発ビルド

#### macOS

```bash
# 1. 依存関係のインストール
npm install

# 2. 開発サーバーの起動
npm run tauri:dev
```

**出力**: 開発用のアプリケーションが起動（デバッグモード）

### 本番ビルド

#### macOS向けビルド

```bash
# 1. 環境変数の設定（必要に応じて）
export API_SERVER_PORT=3011
export CHROMADB_PORT=8000

# 2. Next.jsのビルド
npm run build

# 3. Tauriアプリのビルド
npm run tauri:build
```

**出力**: `src-tauri/target/release/bundle/`にmacOS用パッケージが生成されます

#### Windows向けビルド（macOSからクロスコンパイル）

```bash
# 1. Windows向けターゲットの追加
rustup target add x86_64-pc-windows-msvc

# 2. 環境変数の設定
export API_SERVER_PORT=3011
export CHROMADB_PORT=8000

# 3. Next.jsのビルド
npm run build

# 4. Windows向けTauriアプリのビルド
npm run tauri:build -- --target x86_64-pc-windows-msvc
```

**注意**: クロスコンパイルには追加の設定が必要な場合があります。

#### Windows向けビルド（Windows上でビルド）

```powershell
# 1. 依存関係のインストール
npm install

# 2. 環境変数の設定（必要に応じて）
$env:API_SERVER_PORT="3011"
$env:CHROMADB_PORT="8000"

# 3. Next.jsのビルド
npm run build

# 4. Tauriアプリのビルド
npm run tauri:build
```

**出力**: `src-tauri/target/release/bundle/`にWindows用パッケージが生成されます

---

## ビルド出力

### macOS

- **`.app`**: macOSアプリケーションバンドル
- **`.dmg`**: ディスクイメージ（配布用）

**場所**: `src-tauri/target/release/bundle/macos/`

### Windows

- **`.exe`**: 実行ファイル
- **`.msi`**: Windowsインストーラー（配布用）

**場所**: `src-tauri/target/release/bundle/msi/`

---

## ビルド設定

### Tauri設定ファイル

#### 本番環境 (`tauri.conf.json`)

```json
{
  "productName": "MissionAI",
  "version": "2.1.2",
  "identifier": "com.missionai.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:3010",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../out"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [{
      "title": "MissionAI",
      "width": 1400,
      "height": 900,
      "resizable": true,
      "fullscreen": false,
      "devtools": true,
      "url": "tauri://localhost"
    }],
    "security": {
      "csp": "default-src 'self' tauri://localhost; connect-src 'self' tauri://localhost http://localhost:3011 http://127.0.0.1:3011 ws://localhost:* ws://127.0.0.1:* https://api.openai.com https://api.anthropic.com https://*.ollama.ai; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: file: tauri://localhost; font-src 'self' data: tauri://localhost;"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "resources": ["template-data.json", "../out"]
  }
}
```

**⚠️ 重要な注意**: 
- 本番環境では`app.windows[0].url`が`tauri://localhost`に設定されている必要があります
- 開発環境では`tauri.conf.dev.json`の設定（`http://localhost:3010`）が優先されます
- **現在の`tauri.conf.json`では`url`が`http://localhost:3010`になっていますが、本番ビルド時には`tauri://localhost`に変更する必要があります**

#### 開発環境 (`tauri.conf.dev.json`)

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:3010"
  }
}
```

### バージョン管理

バージョンは以下のファイルで管理されています：

- **`package.json`**: `version`フィールド
- **`src-tauri/Cargo.toml`**: `version`フィールド
- **`src-tauri/tauri.conf.json`**: `version`フィールド

**現在のバージョン**: `2.1.2`

**バージョン更新**:

バージョン更新スクリプトは現在存在しません。以下のファイルを手動で更新してください：

1. **`package.json`**: `version`フィールドを更新
2. **`src-tauri/Cargo.toml`**: `version`フィールドを更新
3. **`src-tauri/tauri.conf.json`**: `version`フィールドを更新

**例**: バージョン`2.1.3`に更新する場合

```bash
# package.json
"version": "2.1.3"

# src-tauri/Cargo.toml
version = "2.1.3"

# src-tauri/tauri.conf.json
"version": "2.1.3"
```

**注意**: 3つのファイルのバージョン番号を必ず一致させてください。

---

## デプロイ手順

### 1. ビルド前の確認

- [ ] すべてのテストが通過している
- [ ] バージョン番号が正しく更新されている
- [ ] 環境変数が正しく設定されている
- [ ] 依存関係が最新である

### 2. クリーンビルド

```bash
# ビルド成果物のクリーンアップ
npm run clean  # 存在する場合
rm -rf src-tauri/target/release
rm -rf .next
rm -rf out
```

### 3. ビルド実行

```bash
# 本番ビルド
npm run build
npm run tauri:build
```

### 4. ビルド成果物の確認

```bash
# macOS
ls -la src-tauri/target/release/bundle/macos/

# Windows
dir src-tauri\target\release\bundle\msi\
```

### 5. テスト

ビルドされたアプリケーションを実行して動作確認：

- [ ] アプリケーションが正常に起動する
- [ ] データベースが正常に初期化される
- [ ] APIサーバーが正常に起動する
- [ ] ChromaDB Serverが正常に起動する（インストールされている場合）
- [ ] 主要機能が正常に動作する

---

## 配布パッケージ

### macOS配布

#### DMGファイルの作成

Tauriが自動的にDMGファイルを作成します：

**場所**: `src-tauri/target/release/bundle/dmg/`

#### コード署名（オプション）

```bash
# コード署名の設定（tauri.conf.json）
{
  "macOS": {
    "signingIdentity": "Developer ID Application: Your Name"
  }
}
```

### Windows配布

#### MSIインストーラーの作成

Tauriが自動的にMSIインストーラーを作成します：

**場所**: `src-tauri/target/release/bundle/msi/`

#### コード署名（オプション）

```bash
# コード署名の設定（tauri.conf.json）
{
  "windows": {
    "certificateThumbprint": "your-certificate-thumbprint"
  }
}
```

---

## クロスプラットフォームビルド

### macOSからWindows向けビルド

#### 前提条件

1. **Rustクロスコンパイルツールチェーン**のインストール
2. **Windows SDK**のインストール（macOS上では困難）

**推奨**: Windowsマシン上でビルドすることを推奨

### WindowsからmacOS向けビルド

**不可能**: macOS向けビルドはmacOS上でのみ可能

---

## ビルド最適化

### Rustリリースビルド

**現在の設定**: `Cargo.toml`には`[profile.release]`セクションが明示的に定義されていません。Rustのデフォルト設定が使用されます。

**デフォルト設定**:
- `opt-level = 3`（最適化レベル3）
- `lto = false`（リンク時最適化は無効）
- `codegen-units = 256`（コード生成単位）

**最適化を強化する場合**（オプション）:

```toml
# Cargo.toml
[profile.release]
opt-level = 3
lto = true  # リンク時最適化を有効化（ビルド時間が長くなるが、バイナリサイズとパフォーマンスが改善）
codegen-units = 1  # コード生成単位を1に設定（最適化が向上するが、コンパイル時間が長くなる）
```

**注意**: `lto = true`と`codegen-units = 1`を設定すると、ビルド時間が大幅に増加します。通常はデフォルト設定で十分です。

### Next.jsビルド最適化

```javascript
// next.config.js
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // その他の最適化設定
}
```

---

## トラブルシューティング

### ビルドが失敗する

**原因**: 依存関係のエラー、コンパイルエラー

**解決方法**:
1. エラーメッセージを確認
2. 依存関係を更新
3. クリーンビルドを実行

```bash
cd src-tauri
cargo clean
cargo build --release
```

### ビルド時間が長い

**原因**: 初回ビルド、依存関係のコンパイル

**解決方法**:
1. 初回ビルドは時間がかかる（正常）
2. 2回目以降はキャッシュが使用される
3. 並列ビルドを有効化（`cargo build -j <cores>`）

### パッケージサイズが大きい

**原因**: デバッグシンボル、未使用の依存関係

**解決方法**:
1. リリースビルドを使用（`--release`）
2. ストリップを実行（デバッグシンボルの削除）

```bash
# macOS
strip src-tauri/target/release/mission-ai

# Windows
strip src-tauri/target/release/mission-ai.exe
```

### Windowsでビルドできない

**原因**: 必要なツールがインストールされていない

**解決方法**:
1. Visual Studio Build Toolsをインストール
2. Windows SDKをインストール
3. Rustツールチェーンを確認

---

## 継続的インテグレーション（CI）

### GitHub Actions例

**現在の状態**: プロジェクトにはGitHub Actionsワークフローファイルがまだ作成されていません。

**推奨ワークフロー**:

`.github/workflows/build.yml`を作成：

```yaml
name: Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true
      
      - name: Install dependencies
        run: npm install
      
      - name: Build frontend
        run: npm run build
      
      - name: Build Tauri app
        run: npm run tauri:build
        env:
          API_SERVER_PORT: 3011
          CHROMADB_PORT: 8000
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.os }}-build
          path: src-tauri/target/release/bundle/
          retention-days: 30
```

**注意**: 
- macOSビルドには追加の設定（コード署名など）が必要な場合があります
- WindowsビルドにはVisual Studio Build Toolsが必要です
- ChromaDB ServerのビルドにはPython環境が必要です

---

## 関連ドキュメント

- [開発ガイドライン](../development/DEVELOPMENT_GUIDELINES.md)
- [環境変数](../environment/ENVIRONMENT_VARIABLES.md)
- [Rust/Tauri設定](../rust/RUST_TAURI_CONFIGURATION.md)
- [トラブルシューティング](../troubleshooting/TROUBLESHOOTING.md)

---

最終更新: 2025-12-11
