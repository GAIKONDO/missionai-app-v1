# Troubleshooting ドキュメント

このフォルダには、MissionAIプロジェクトのトラブルシューティングに関するドキュメントが含まれています。

## 📁 ファイル構成

### 総合トラブルシューティングガイド

#### `TROUBLESHOOTING.md` ⭐ **最重要**
- **ステータス**: アクティブ（トラブルシューティングガイド）
- **用途**: よくある問題と解決方法、デバッグ手順
- **対象読者**: すべての開発者、運用担当者
- **内容**:
  - ログの確認方法
  - よくある問題と解決方法
    - アプリケーション起動関連
    - データベース関連
    - ChromaDB関連
    - APIサーバー関連
    - 環境変数関連
    - ビルド関連
    - パフォーマンス関連
  - デバッグ手順
  - エラーメッセージ一覧
  - サポート情報

## 🔗 ドキュメント間の関係性

```
TROUBLESHOOTING.md (総合トラブルシューティング)
    ├─→ ../rag-search/RAG_SEARCH_TROUBLESHOOTING.md（RAG検索のトラブルシューティング）
    ├─→ ../rag-search/WHY_SEARCH_RESULTS_ZERO.md（検索結果が0件になる理由）
    ├─→ ../architecture/port-design-concerns.md（ポート設計の懸念点）
    ├─→ ../environment/ENVIRONMENT_VARIABLES.md（環境変数の参照）
    └─→ ../deployment/BUILD_AND_DEPLOYMENT.md（ビルド・デプロイの参照）
```

## 📖 読み方のガイド

### 問題が発生した場合

1. **まず読む**: `TROUBLESHOOTING.md`（総合トラブルシューティング）
2. **特定の問題の場合**: 該当する機能のトラブルシューティングドキュメントを参照
   - RAG検索: `../rag-search/RAG_SEARCH_TROUBLESHOOTING.md`
   - ポート関連: `../architecture/port-design-concerns.md`

### デバッグ担当者

1. **まず読む**: `TROUBLESHOOTING.md`（デバッグ手順の確認）
2. **参考**: 各機能のトラブルシューティングドキュメント

## 📝 ドキュメントの更新方針

- **総合トラブルシューティングガイド** (`TROUBLESHOOTING.md`): 新しい問題の発見時に更新
- エラーメッセージの追加時に更新
- 解決方法の改善時に更新

## 🔄 重要な変更履歴

### 2025-01-15
- `TROUBLESHOOTING.md`を作成
  - よくある問題と解決方法を文書化
  - アプリケーション起動、データベース、ChromaDB、APIサーバー関連の問題を記載
  - デバッグ手順、エラーメッセージ一覧、サポート情報を追加

---

最終更新: 2025-12-11
