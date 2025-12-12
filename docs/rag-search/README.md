# RAG検索ドキュメント

> **📋 ステータス**: アクティブ（ドキュメントインデックス）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: RAG検索フォルダのドキュメント概要とナビゲーション

## 📋 フォルダ概要

このフォルダには、RAG（Retrieval-Augmented Generation）検索機能に関するドキュメントが含まれています。RAG検索は、ChromaDBとSQLiteを組み合わせたハイブリッド検索システムで、エンティティ、リレーション、トピックの統合検索を提供します。

## 📚 ドキュメント一覧

### 1. RAG_SEARCH_TROUBLESHOOTING.md
**ステータス**: アクティブ（トラブルシューティングガイド）  
**用途**: RAG検索でデータが見つからない場合の原因と解決方法

**内容**:
- RAG検索の基本的なフロー
- 検索タイプ別のフロー（エンティティ、リレーション、トピック）
- データが見つからない場合の確認ポイント
- デバッグ方法
- よくある問題と解決方法

**読むべき人**: 
- RAG検索で問題が発生した開発者
- トラブルシューティングが必要なユーザー

---

### 2. SEARCH_DATABASE_FLOW.md
**ステータス**: アクティブ（実装仕様書）  
**用途**: RAG検索時のデータベース参照フローの詳細説明

**内容**:
- 検索フローの全体像
- エンティティ検索の詳細フロー（ChromaDB → SQLiteフォールバック）
- リレーション検索の詳細フロー
- トピック検索の詳細フロー（ChromaDBのみ、SQLiteフォールバックなし）
- データベース参照先のまとめ表

**読むべき人**: 
- RAG検索の実装を理解したい開発者
- データベース参照フローを確認したい開発者

---

### 3. WHY_SEARCH_RESULTS_ZERO.md
**ステータス**: アクティブ（問題解決ガイド）  
**用途**: 検索結果が0件になる原因と解決方法

**内容**:
- データの保存フロー（ChromaDB使用時 vs 未使用時）
- 検索フローの問題点
- 解決方法（SQLiteの基本テーブルから検索、ChromaDBに再保存、organizationId指定）
- 実際のコード修正案

**読むべき人**: 
- 検索結果が0件になる問題に直面している開発者
- データ整合性の問題を理解したい開発者

---

### 4. RAG_SEARCH_EVALUATION.md
**ステータス**: アクティブ（評価レポート）  
**用途**: RAG検索システムの評価と改善提案

**内容**:
- 優れている点（アーキテクチャ設計、パフォーマンス最適化、エラーハンドリング、ユーザー体験）
- 問題点と改善提案（データ整合性、ChromaDB設定管理、エラーハンドリング、パフォーマンス、データ同期、スコアリング、キャッシュ）
- パフォーマンス指標
- 実装優先度（高/中/低）
- 推奨アクション

**読むべき人**: 
- RAG検索システムの改善を検討している開発者
- システムの評価を理解したい開発者

---

### 5. RAG_IMPROVEMENTS.md
**ステータス**: アクティブ（改善案・実装計画）  
**用途**: RAG機能の改善案と実装ステップの管理

**内容**:
- 現在の実装状況（完了済み、UI実装、AIアシスタント統合）
- 優先度別改善案（高/中/低優先度）
- 実装順序の推奨（Phase 1/2/3）
- 技術的な考慮事項（パフォーマンス、スケーラビリティ、ユーザー体験、保守性）
- 成功指標
- 次のアクション

**読むべき人**: 
- RAG機能の改善を計画している開発者
- 実装ロードマップを確認したい開発者

---

## 🔗 ドキュメント間の関係

```
RAG_SEARCH_TROUBLESHOOTING.md
    ↓ (参照)
SEARCH_DATABASE_FLOW.md
    ↓ (参照)
WHY_SEARCH_RESULTS_ZERO.md
    ↓ (参照)
RAG_SEARCH_EVALUATION.md
    ↓ (参照)
RAG_IMPROVEMENTS.md
```

**関係の説明**:
1. **RAG_SEARCH_TROUBLESHOOTING.md** は、問題が発生した際の最初の参照先です。
2. **SEARCH_DATABASE_FLOW.md** は、検索フローの詳細を理解するために参照されます。
3. **WHY_SEARCH_RESULTS_ZERO.md** は、特定の問題（検索結果0件）に焦点を当てています。
4. **RAG_SEARCH_EVALUATION.md** は、システム全体の評価と改善提案を提供します。
5. **RAG_IMPROVEMENTS.md** は、具体的な改善案と実装計画を管理します。

## 📖 読み方ガイド

### 初めてRAG検索を理解する場合

1. **SEARCH_DATABASE_FLOW.md** から始める
   - 検索フローの全体像を理解
   - データベース参照の順序を把握

2. **RAG_SEARCH_TROUBLESHOOTING.md** を読む
   - 基本的な検索フローを確認
   - よくある問題を理解

### 問題が発生した場合

1. **RAG_SEARCH_TROUBLESHOOTING.md** を参照
   - 問題の原因を特定
   - 解決方法を確認

2. **WHY_SEARCH_RESULTS_ZERO.md** を参照（検索結果が0件の場合）
   - データの保存場所と検索場所の不一致を理解
   - 解決方法を確認

3. **SEARCH_DATABASE_FLOW.md** を参照
   - 検索フローの詳細を確認
   - データベース参照先を確認

### システム改善を検討する場合

1. **RAG_SEARCH_EVALUATION.md** を読む
   - システムの評価を理解
   - 改善提案を確認

2. **RAG_IMPROVEMENTS.md** を読む
   - 具体的な改善案を確認
   - 実装計画を確認

## 🔄 更新ポリシー

- **SEARCH_DATABASE_FLOW.md**: 検索フローが変更された場合に更新
- **RAG_SEARCH_TROUBLESHOOTING.md**: 新しい問題や解決方法が発見された場合に更新
- **WHY_SEARCH_RESULTS_ZERO.md**: 検索結果0件の問題が解決された場合に更新
- **RAG_SEARCH_EVALUATION.md**: システム評価が更新された場合、または改善提案が実装された場合に更新
- **RAG_IMPROVEMENTS.md**: 改善案が実装された場合、または新しい改善案が追加された場合に更新

## 📝 重要な変更履歴

### 2025-01-15（整合性チェック後）
- **SEARCH_DATABASE_FLOW.md**: 
  - SQLiteフォールバックの記述を削除（実装から削除済み）
  - ChromaDBが無効な場合、またはorganizationIdが未指定の場合の動作を明確化
  - エンティティ・リレーション検索にもSQLiteフォールバックがないことを明記
- **RAG_SEARCH_TROUBLESHOOTING.md**: 
  - SQLiteフォールバックの記述を削除
  - ChromaDBが無効な場合の動作を明確化
- **WHY_SEARCH_RESULTS_ZERO.md**: 
  - SQLiteフォールバックの記述を削除
  - 解決方法を更新（ChromaDBを有効化することが必須）

### 2025-01-15
- **SEARCH_DATABASE_FLOW.md**: 
  - `topicRelations` → `relations`テーブルに修正（リネーム済み）
  - Firestoreフォールバックの記述を削除（実装から削除済み）
  - `topicEmbeddings` → `topics`テーブルに修正（統合済み）
  - トピック検索にSQLiteフォールバックがないことを明記

- **RAG_SEARCH_TROUBLESHOOTING.md**: 
  - Firestoreへのフォールバック記述を削除
  - トピック検索にSQLiteフォールバックがないことを明記
  - ステータスヘッダーを追加

- **WHY_SEARCH_RESULTS_ZERO.md**: 
  - テーブル名を修正（`topicRelations` → `relations`、`topicEmbeddings` → `topics`）
  - トピック検索のフォールバック動作を修正
  - ステータスヘッダーを追加

- **RAG_SEARCH_EVALUATION.md**: 
  - 実装状況を明記（一部実装済み、未実装）
  - 改善提案のステータスを追加
  - ステータスヘッダーを追加

- **RAG_IMPROVEMENTS.md**: 
  - ステータスヘッダーを追加

## 🔗 関連ドキュメント

### データベース関連
- [データベース設計](../database/database-design.md) - SQLiteデータベースの設計
- [埋め込みベクトルの保存場所](../database/EMBEDDING_STORAGE_LOCATIONS.md) - 埋め込みベクトルの保存場所の詳細

### ChromaDB関連
- [ChromaDB統合計画](../chromadb/CHROMADB_INTEGRATION_PLAN.md) - ChromaDB統合の実装計画
- [ChromaDB使用ガイド](../chromadb/CHROMADB_USAGE_GUIDE.md) - ChromaDBのセットアップとトラブルシューティング

### アーキテクチャ関連
- [ポートとサーバー設計](../architecture/port-and-server-design.md) - ポート設計とサーバー構成

## 📌 注意事項

1. **テーブル名の変更**: 
   - `topicRelations` → `relations`（リネーム済み）
   - `topicEmbeddings` → `topics`（統合済み）

2. **Firestoreの削除**: 
   - Firestoreへのフォールバックは実装から削除済み
   - トピック検索はChromaDBのみ（SQLiteフォールバックなし）

3. **データの保存場所**: 
   - 埋め込みベクトルはChromaDBにのみ保存
   - SQLiteにはメタデータのみ保存

4. **フォールバック動作**: 
   - **SQLiteフォールバックはありません**（すべての検索タイプで）
   - エンティティ・リレーション・トピック検索: ChromaDBのみ
   - ChromaDBが無効な場合、またはorganizationIdが未指定の場合、検索結果は空になります
