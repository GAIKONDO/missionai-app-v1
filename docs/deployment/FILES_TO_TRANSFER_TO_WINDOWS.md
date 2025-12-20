# Windows環境に移動させるファイル一覧

> **📋 ステータス**: アクティブ（ファイル転送ガイド）  
> **📅 作成日**: 2025-01-XX  
> **👤 用途**: Windows環境に転送すべきファイルの明確なリスト

## 概要

Windows環境でビルドするために必要なファイルを明確にリストアップします。

**推奨方法**: ZIPファイルを作成して転送（`create-windows-deploy-package.sh`を使用）

**代替方法**: 以下のファイル・ディレクトリを手動で転送

---

## 必須ファイル・ディレクトリ

### ✅ ソースコード

以下のディレクトリ全体を転送：

1. **`app/`** - Next.jsアプリケーションディレクトリ
   - すべてのページコンポーネント
   - ルーティング設定

2. **`components/`** - Reactコンポーネント
   - 再利用可能なコンポーネント
   - ページコンポーネント

3. **`lib/`** - ライブラリコード
   - ユーティリティ関数
   - APIクライアント
   - データベース関連コード

4. **`types/`** - TypeScript型定義
   - 型定義ファイル（`.ts`）

5. **`scripts/`** - ビルドスクリプト
   - ビルド・デプロイ用スクリプト

### ✅ 設定ファイル

以下のファイルを転送：

1. **`package.json`** - Node.js依存関係（必須）
2. **`package-lock.json`** - 依存関係のロックファイル（必須）
3. **`tsconfig.json`** - TypeScript設定（必須）
4. **`next.config.js`** - Next.js設定（必須）
5. **`.gitignore`** - Git除外設定（推奨）

### ✅ Tauri関連

以下のファイル・ディレクトリを転送：

1. **`src-tauri/src/`** - Rustソースコード（必須）
   - すべての`.rs`ファイル

2. **`src-tauri/icons/`** - アプリケーションアイコン（必須）
   - `icon.ico`（Windows用）
   - `icon.icns`（Mac用）
   - その他のアイコンファイル

3. **`src-tauri/resources/`** - リソースファイル（必須）
   - `plantuml.jar`など

4. **`src-tauri/tauri.conf.json`** - Tauri設定（必須）
5. **`src-tauri/tauri.conf.dev.json`** - Tauri開発設定（推奨）
6. **`src-tauri/Cargo.toml`** - Rust依存関係（必須）
7. **`src-tauri/build.rs`** - ビルドスクリプト（必須）

### ✅ データファイル（オプション）

1. **`data/`** - データファイル（必要に応じて）
   - CSVファイル
   - SQLファイル
   - その他のデータファイル

### ✅ ドキュメント（オプション）

1. **`docs/`** - ドキュメント（必要に応じて）
2. **`README_INSTALL.md`** - インストールガイド（推奨）
3. **`DISTRIBUTION_README.md`** - 配布用README（推奨）

---

## ❌ 転送不要なファイル・ディレクトリ

以下のファイル・ディレクトリは**転送不要**です（Windows環境で再生成されます）：

### ビルド成果物

- **`node_modules/`** - Windowsで`npm install`で再生成
- **`.next/`** - Windowsで`npm run build`で再生成
- **`out/`** - Windowsで`npm run build`で再生成
- **`src-tauri/target/`** - Windowsで`cargo build`で再生成
- **`src-tauri/Cargo.lock`** - Windowsで`cargo build`で再生成

### Mac固有ファイル

- **`.DS_Store`** - Mac固有のメタデータ
- **`._*`** - Mac固有のリソースフォーク
- **`build-mac.command`** - Mac専用ビルドスクリプト
- **`install-dependencies-auto.command`** - Mac専用スクリプト
- **`start-dev.command`** - Mac専用スクリプト

### その他

- **`.vscode/`** - IDE設定（個人設定）
- **`.idea/`** - IDE設定（個人設定）
- **`*.log`** - ログファイル
- **`.env*.local`** - ローカル環境変数

---

## 転送方法

### 方法1: ZIPファイルを使用（推奨）

**Mac環境で実行**:

```bash
# ZIPファイルを作成
./create-windows-deploy-package.sh
```

**生成されるファイル**:
- `MissionAI-Windows-Deploy-v2.1.2-YYYYMMDD.zip`

**Windows環境で実行**:

```powershell
# ZIPファイルを展開
Expand-Archive -Path "MissionAI-Windows-Deploy-v2.1.2-YYYYMMDD.zip" -DestinationPath "C:\Projects\MissionAI"
```

### 方法2: 手動でファイルを転送

以下のディレクトリ構造を維持して転送：

```
MissionAI/
├── app/                    # ✅ 転送
├── components/            # ✅ 転送
├── lib/                    # ✅ 転送
├── types/                  # ✅ 転送
├── scripts/                # ✅ 転送
├── data/                   # ✅ 転送（オプション）
├── docs/                   # ✅ 転送（オプション）
├── package.json            # ✅ 転送
├── package-lock.json      # ✅ 転送
├── tsconfig.json           # ✅ 転送
├── next.config.js          # ✅ 転送
├── .gitignore              # ✅ 転送（推奨）
├── README_INSTALL.md       # ✅ 転送（推奨）
├── DISTRIBUTION_README.md  # ✅ 転送（推奨）
└── src-tauri/              # ✅ 転送
    ├── src/                # ✅ 転送
    ├── icons/              # ✅ 転送
    ├── resources/          # ✅ 転送
    ├── tauri.conf.json     # ✅ 転送
    ├── tauri.conf.dev.json # ✅ 転送
    ├── Cargo.toml          # ✅ 転送
    └── build.rs            # ✅ 転送
```

---

## ファイル一覧（詳細）

### ルートディレクトリ

| ファイル/ディレクトリ | 必須 | 説明 |
|---------------------|------|------|
| `app/` | ✅ | Next.jsアプリケーションディレクトリ |
| `components/` | ✅ | Reactコンポーネント |
| `lib/` | ✅ | ライブラリコード |
| `types/` | ✅ | TypeScript型定義 |
| `scripts/` | ✅ | ビルドスクリプト |
| `data/` | ⚠️ | データファイル（オプション） |
| `docs/` | ⚠️ | ドキュメント（オプション） |
| `package.json` | ✅ | Node.js依存関係 |
| `package-lock.json` | ✅ | 依存関係のロックファイル |
| `tsconfig.json` | ✅ | TypeScript設定 |
| `next.config.js` | ✅ | Next.js設定 |
| `.gitignore` | ⚠️ | Git除外設定（推奨） |
| `README_INSTALL.md` | ⚠️ | インストールガイド（推奨） |
| `DISTRIBUTION_README.md` | ⚠️ | 配布用README（推奨） |

### src-tauriディレクトリ

| ファイル/ディレクトリ | 必須 | 説明 |
|---------------------|------|------|
| `src-tauri/src/` | ✅ | Rustソースコード |
| `src-tauri/icons/` | ✅ | アプリケーションアイコン |
| `src-tauri/resources/` | ✅ | リソースファイル |
| `src-tauri/tauri.conf.json` | ✅ | Tauri設定 |
| `src-tauri/tauri.conf.dev.json` | ⚠️ | Tauri開発設定（推奨） |
| `src-tauri/Cargo.toml` | ✅ | Rust依存関係 |
| `src-tauri/build.rs` | ✅ | ビルドスクリプト |

---

## 転送後の確認

Windows環境で以下のコマンドを実行して、必要なファイルが揃っているか確認：

```powershell
# 必須ディレクトリの確認
$requiredDirs = @("app", "components", "lib", "types", "scripts", "src-tauri")
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "✓ $dir が存在します"
    } else {
        Write-Host "✗ $dir が見つかりません"
    }
}

# 必須ファイルの確認
$requiredFiles = @(
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.js",
    "src-tauri\tauri.conf.json",
    "src-tauri\Cargo.toml",
    "src-tauri\build.rs"
)
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file が存在します"
    } else {
        Write-Host "✗ $file が見つかりません"
    }
}
```

---

## チェックリスト

### Mac環境（転送前）

- [ ] 最新の変更が保存されている
- [ ] ZIPファイルを作成した（または手動でファイルを準備した）
- [ ] 必須ファイル・ディレクトリがすべて含まれている

### Windows環境（転送後）

- [ ] ZIPファイルを展開した（またはファイルを転送した）
- [ ] 必須ディレクトリがすべて存在する
- [ ] 必須ファイルがすべて存在する
- [ ] ディレクトリ構造が正しい

---

## トラブルシューティング

### 問題1: ファイルが見つからない

**症状**: Windows環境でビルド時に「ファイルが見つかりません」エラー

**原因**: 必要なファイルが転送されていない

**解決方法**:
1. 上記のチェックリストで必須ファイルを確認
2. 不足しているファイルをMac環境から転送

### 問題2: ディレクトリ構造が壊れている

**症状**: 相対パス参照が失敗する

**原因**: ディレクトリ構造が正しく転送されていない

**解決方法**:
1. ディレクトリ構造を確認
2. 必要に応じてZIPファイルから再展開

### 問題3: 古いファイルが混在している

**症状**: ビルドしても古いバージョンになる

**原因**: 古いファイルが残っている

**解決方法**:
1. Windows環境で古いビルド成果物を削除
2. 最新のZIPファイルを展開
3. クリーンビルドを実行

---

## まとめ

### 転送すべきもの

✅ **ソースコード**: `app/`, `components/`, `lib/`, `types/`, `scripts/`  
✅ **設定ファイル**: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.js`  
✅ **Tauri関連**: `src-tauri/`ディレクトリ全体（`target/`と`Cargo.lock`を除く）

### 転送不要なもの

❌ **ビルド成果物**: `node_modules/`, `.next/`, `out/`, `src-tauri/target/`  
❌ **Mac固有ファイル**: `.DS_Store`, `build-mac.command`など

### 推奨方法

1. **ZIPファイルを使用**（`create-windows-deploy-package.sh`を実行）
2. Windows環境でZIPファイルを展開
3. クリーンビルドを実行

---

## 関連ドキュメント

- [Windowsデプロイ用パッケージ作成ガイド](./WINDOWS_DEPLOYMENT_PACKAGE_GUIDE.md)
- [Windowsビルドで古いバージョンになる問題の解決](./WINDOWS_BUILD_VERSION_ISSUE.md)
- [静的ファイル保存ガイド](./STATIC_FILES_GUIDE.md)

---

最終更新: 2025-01-XX
