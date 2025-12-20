# RAG検索ページ分割計画

## 📊 現状分析
- **ファイルサイズ**: 2966行
- **主な問題点**:
  - 状態管理が多すぎる（20以上のuseState）
  - UIコンポーネントとロジックが混在
  - モーダルコンポーネントが同一ファイル内
  - 再利用性が低い

## 🎯 分割方針

### ディレクトリ構造
```
app/rag-search/
├── page.tsx                          # メインページ（簡潔化）
├── components/                        # ページ固有コンポーネント
│   ├── SearchBar.tsx                  # 検索バー + 履歴ドロップダウン
│   ├── SearchFilters.tsx              # フィルターUI
│   ├── SearchResultsList.tsx          # 検索結果リスト表示
│   ├── SearchResultItem.tsx           # 個別検索結果アイテム
│   ├── SearchResultDetail.tsx         # 詳細表示パネル
│   ├── SearchResultsHeader.tsx        # 検索結果ヘッダー（統計・エクスポート）
│   └── modals/                        # モーダルコンポーネント
│       ├── AnalyticsModal.tsx         # 分析モーダル
│       ├── EmbeddingStatsModal.tsx    # 埋め込み統計モーダル
│       ├── DataQualityReportModal.tsx # データ品質レポートモーダル
│       └── EvaluationPanelModal.tsx   # 評価・テストシステムモーダル
├── hooks/                             # カスタムフック
│   ├── useRAGSearch.ts                # 検索ロジック
│   ├── useSearchHistory.ts           # 検索履歴管理
│   ├── useSearchFilters.ts           # フィルター管理
│   └── useGraphData.ts               # グラフデータ準備
└── types.ts                           # 型定義

```

## 📝 分割手順

### フェーズ1: 型定義とユーティリティの抽出
1. **types.ts** を作成
   - `SearchHistory` インターフェース
   - その他の型定義を移動

### フェーズ2: カスタムフックの作成
2. **hooks/useSearchHistory.ts**
   - 検索履歴の読み込み・保存
   - お気に入り管理
   - 履歴削除機能

3. **hooks/useSearchFilters.ts**
   - フィルター状態管理
   - プリセット管理
   - フィルター適用ロジック

4. **hooks/useRAGSearch.ts**
   - 検索実行ロジック
   - 検索結果管理
   - キャッシュ管理
   - フィードバック管理

5. **hooks/useGraphData.ts**
   - グラフデータ準備
   - エンティティ・リレーション収集

### フェーズ3: UIコンポーネントの分離
6. **components/SearchBar.tsx**
   - 検索入力フィールド
   - 検索履歴ドロップダウン
   - 検索ボタン
   - 評価・テストボタン

7. **components/SearchFilters.tsx**
   - フィルターUI全体
   - 組織・タイプ・日付フィルター
   - プリセット管理UI

8. **components/SearchResultsHeader.tsx**
   - 検索結果統計
   - ビューモード切り替え
   - エクスポートボタン
   - 各種統計ボタン

9. **components/SearchResultItem.tsx**
   - 個別検索結果の表示
   - フィードバックボタン
   - グラフ表示ボタン

10. **components/SearchResultsList.tsx**
    - 検索結果リスト全体
    - リスト/グラフビューの切り替え

11. **components/SearchResultDetail.tsx**
    - 詳細表示パネル

### フェーズ4: モーダルコンポーネントの分離
12. **components/modals/AnalyticsModal.tsx**
    - 分析モーダル（2106-2249行目）

13. **components/modals/EmbeddingStatsModal.tsx**
    - 埋め込み統計モーダル（2251-2470行目）

14. **components/modals/DataQualityReportModal.tsx**
    - データ品質レポートモーダル（2472-2653行目）

15. **components/modals/EvaluationPanelModal.tsx**
    - 評価・テストシステムモーダル（2655-2962行目）

### フェーズ5: メインページの簡潔化
16. **page.tsx のリファクタリング**
    - カスタムフックの使用
    - コンポーネントの組み合わせ
    - 状態管理の最小化

## 🔄 移行の優先順位

### 優先度: 高
1. モーダルコンポーネント（最も独立している）
2. 検索バーコンポーネント（再利用性が高い）

### 優先度: 中
3. カスタムフック（ロジックの分離）
4. 検索結果コンポーネント

### 優先度: 低
5. 型定義の整理
6. ユーティリティ関数の抽出

## ✅ 期待される効果

1. **可読性の向上**: 各ファイルが200-300行程度に
2. **保守性の向上**: 機能ごとにファイルが分離
3. **再利用性の向上**: コンポーネントの再利用が容易に
4. **テスト容易性**: 各コンポーネントを個別にテスト可能
5. **パフォーマンス**: 必要に応じて動的インポートが可能

## ⚠️ 注意事項

1. **段階的な移行**: 一度にすべてを変更せず、段階的に移行
2. **型安全性の維持**: TypeScriptの型定義を適切に管理
3. **状態管理の一貫性**: カスタムフックで状態管理を統一
4. **既存機能の維持**: リファクタリング中も既存機能を維持
5. **テスト**: 各フェーズで動作確認を実施

