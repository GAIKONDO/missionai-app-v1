# React ドキュメント

このフォルダには、MissionAIプロジェクトのReact/Next.jsフロントエンド設定に関するドキュメントが含まれています。

## 📁 ファイル構成

### 設定仕様書

#### `REACT_CONFIGURATION.md` ⭐ **最重要**
- **ステータス**: アクティブ（設定仕様書）
- **用途**: React/Next.jsフロントエンドの設定、ビルド、実行環境の詳細
- **対象読者**: すべての開発者（必読）
- **内容**:
  - 技術スタック
  - Next.js設定（next.config.js）
  - TypeScript設定（tsconfig.json）
  - ポート設定
  - 環境変数
  - React Query設定
  - エラーハンドリング
  - フォント設定
  - ルーティング
  - Tauri統合
  - ビルドと実行
  - パフォーマンス最適化
  - トラブルシューティング

## 🔗 ドキュメント間の関係性

```
REACT_CONFIGURATION.md (React設定)
    ├─→ ../architecture/port-and-server-design.md (ポート設計の参照)
    ├─→ ../development/DEVELOPMENT_GUIDELINES.md (開発ガイドライン)
    └─→ ../database/database-design.md (データベース設計)
```

## 📖 読み方のガイド

### 新規開発者・実装者

1. **まず読む**: `REACT_CONFIGURATION.md`（React/Next.js設定を理解）
2. **次に読む**: `../architecture/port-and-server-design.md`（ポート設計を理解）
3. **参考**: `../development/DEVELOPMENT_GUIDELINES.md`（開発ガイドラインを理解）

### フロントエンド開発者

1. **まず読む**: `REACT_CONFIGURATION.md`（React/Next.js設定の確認）
2. **参考**: `../architecture/port-and-server-design.md`（API接続設定の確認）

### デバッグ担当者

1. **まず読む**: `REACT_CONFIGURATION.md`（設定とトラブルシューティングの確認）
2. **参考**: `../architecture/port-design-concerns.md`（ポート設計の懸念点）

## 📝 ドキュメントの更新方針

- **設定仕様書** (`REACT_CONFIGURATION.md`): 実装に合わせて継続的に更新
- Next.js設定変更時（next.config.js）に更新
- TypeScript設定変更時（tsconfig.json）に更新
- 新しいライブラリ追加時に更新
- パフォーマンス最適化の実施時に更新

## 🔄 重要な変更履歴

### 2025-01-15（整合性チェック後）
- `REACT_CONFIGURATION.md`を更新
  - `Noto_Sans_JP`フォントの`subsets`設定に注意書きを追加（実装では`['latin']`を使用）
  - `tauri.conf.json`の本番環境設定を実装に合わせて更新（`withGlobalTauri`、CSP設定を追加）
  - `tauri.conf.dev.json`の開発環境設定を実装に合わせて更新（ウィンドウ設定、CSP設定を追加）
  - Tauri統合の説明を明確化（本番環境では`frontendDist`から静的ファイルが配信されることを明記）

### 2025-01-15
- `REACT_CONFIGURATION.md`を作成
  - React/Next.js設定の詳細を文書化
  - Next.js設定、TypeScript設定、React Query設定を説明
  - ポート設定、環境変数、Tauri統合を記載
  - ビルドと実行、パフォーマンス最適化、トラブルシューティングを追加

---

最終更新: 2025-12-11
