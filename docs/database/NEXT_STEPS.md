# データベース最適化 - 次のステップ

## 現在の状況

✅ **完了済み**:
1. SQLiteテーブルに最適化カラムを追加（`searchableText`, `contentSummary`, `displayName`）
2. 検索用インデックスを追加
3. ChromaDBコレクション名の修正（`organizationId`が空文字列の場合）

## 次のステップ（優先順位順）

### ステップ1: データ追加時の自動更新処理 ⭐⭐⭐（最優先）

**目的**: 新しいデータを追加・更新する際に、`searchableText`、`contentSummary`、`displayName`カラムを自動的に更新する

**実装箇所**:
1. **topicsテーブル**: `contentSummary`と`searchableText`を自動生成
2. **entitiesテーブル**: `searchableText`と`displayName`を自動生成
3. **relationsテーブル**: `searchableText`を自動生成

**実装方法**:
- SQLiteのトリガーを使用（推奨）
- または、アプリケーション側でINSERT/UPDATE時に自動計算

**メリット**:
- データ追加時に自動的に最適化カラムが更新される
- 手動での更新が不要
- RAG検索のパフォーマンスが向上

### ステップ2: RAG検索結果の拡張 ⭐⭐（高優先度）

**目的**: 検索結果にトピック情報（title, contentSummary）を含める

**実装内容**:
- `KnowledgeGraphSearchResult`インターフェースを拡張
- トピック検索結果に`topic`オブジェクトを追加
- エンティティ・リレーション検索結果に関連情報を追加

**メリット**:
- 検索結果がより詳細になる
- AIアシスタントへのコンテキストが充実する

### ステップ3: コンテキスト生成の最適化 ⭐⭐（高優先度）

**目的**: トークン制限内で重要な情報のみを含める

**実装内容**:
- 優先度スコアの計算
- トークン数の見積もり
- 重要度の高い情報を優先的に含める

**メリット**:
- トークン消費の最適化
- より効率的なコンテキスト生成

### ステップ4: ChromaDBメタデータの最適化 ⭐（中優先度）

**目的**: ChromaDBのメタデータから不要な情報を削除

**実装内容**:
- `embeddingModel`、`embeddingVersion`などを削除
- 最小限のメタデータのみを保存

**メリット**:
- メタデータサイズの削減
- 検索パフォーマンスの向上

## 推奨される実装順序

1. **ステップ1: データ追加時の自動更新処理**（最優先）
   - これがないと、新しいカラムが使われない
   - データ追加・更新時に自動的に最適化カラムが更新される

2. **ステップ2: RAG検索結果の拡張**
   - 検索結果がより詳細になる
   - AIアシスタントへのコンテキストが充実する

3. **ステップ3: コンテキスト生成の最適化**
   - トークン消費の最適化
   - より効率的なコンテキスト生成

4. **ステップ4: ChromaDBメタデータの最適化**
   - メタデータサイズの削減
   - 検索パフォーマンスの向上

## 実装の詳細

### ステップ1: データ追加時の自動更新処理

#### topicsテーブル

```sql
-- contentSummaryを生成（contentの最初の200文字）
UPDATE topics 
SET contentSummary = SUBSTR(content, 1, 200)
WHERE contentSummary IS NULL AND content IS NOT NULL;

-- searchableTextを生成（title + description + contentSummary）
UPDATE topics 
SET searchableText = 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(contentSummary, '')
WHERE searchableText IS NULL;
```

#### entitiesテーブル

```sql
-- searchableTextを生成（name + aliases + metadataの重要フィールド）
UPDATE entities 
SET searchableText = 
    COALESCE(name, '') || ' ' || 
    COALESCE(aliases, '') || ' ' || 
    COALESCE(JSON_EXTRACT(metadata, '$.role'), '') || ' ' ||
    COALESCE(JSON_EXTRACT(metadata, '$.department'), '')
WHERE searchableText IS NULL;

-- displayNameを生成（name + 重要なメタデータ）
UPDATE entities 
SET displayName = 
    name || 
    CASE 
        WHEN JSON_EXTRACT(metadata, '$.role') IS NOT NULL 
        THEN ' (' || JSON_EXTRACT(metadata, '$.role') || ')'
        ELSE ''
    END
WHERE displayName IS NULL;
```

#### relationsテーブル

```sql
-- searchableTextを生成（relationType + description + metadataの重要フィールド）
UPDATE relations 
SET searchableText = 
    COALESCE(relationType, '') || ' ' || 
    COALESCE(description, '')
WHERE searchableText IS NULL;
```

### 実装方法の選択

#### オプション1: SQLiteトリガー（推奨）

**メリット**:
- 自動的に実行される
- アプリケーション側の変更が不要
- データ整合性が保証される

**デメリット**:
- SQLiteのトリガー構文を理解する必要がある
- デバッグがやや難しい

#### オプション2: アプリケーション側で自動計算

**メリット**:
- 実装が簡単
- デバッグが容易

**デメリット**:
- すべてのINSERT/UPDATE箇所を修正する必要がある
- 漏れがある可能性

## 次のアクション

**推奨**: ステップ1（データ追加時の自動更新処理）から始める

**理由**:
1. これがないと、新しいカラムが使われない
2. データ追加・更新時に自動的に最適化カラムが更新される
3. その後のステップ（RAG検索結果の拡張、コンテキスト生成の最適化）の基盤になる






