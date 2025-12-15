# 事業会社データベース設計の比較検討

> **📋 ステータス**: 設計検討中  
> **📅 作成日**: 2025-12-11  
> **👤 用途**: 事業会社の注力施策・議事録を保存するデータベース設計の比較検討

## 概要

事業会社の専用ページに「注力施策」と「議事録」機能を追加する際のデータベース設計について、2つのアプローチを比較検討します。

## 比較対象

### オプション1: 既存テーブルを拡張（推奨）

既存の`focusInitiatives`と`meetingNotes`テーブルに`companyId`カラムを追加し、組織と事業会社の両方で使用可能にする。

### オプション2: 新しいテーブルを作成

事業会社専用の新しいテーブル（`companyFocusInitiatives`、`companyMeetingNotes`）を作成する。

## 詳細比較

### 1. データ構造

#### オプション1: 既存テーブル拡張

```sql
-- 既存テーブルを拡張
ALTER TABLE focusInitiatives ADD COLUMN companyId TEXT;
ALTER TABLE meetingNotes ADD COLUMN companyId TEXT;

-- データ構造
focusInitiatives {
  id: TEXT PRIMARY KEY,
  organizationId: TEXT,  -- NULL可能（事業会社の場合はNULL）
  companyId: TEXT,        -- NULL可能（組織の場合はNULL）
  title: TEXT NOT NULL,
  description: TEXT,
  content: TEXT,
  ...
}

meetingNotes {
  id: TEXT PRIMARY KEY,
  organizationId: TEXT,  -- NULL可能（事業会社の場合はNULL）
  companyId: TEXT,        -- NULL可能（組織の場合はNULL）
  title: TEXT NOT NULL,
  description: TEXT,
  content: TEXT,
  ...
}
```

**制約**:
- `organizationId`と`companyId`のどちらか一方は必ずNOT NULLである必要がある
- 両方NULL、両方NOT NULLは許可しない

#### オプション2: 新しいテーブル作成

```sql
-- 新しいテーブルを作成
CREATE TABLE companyFocusInitiatives (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  ...
  FOREIGN KEY (companyId) REFERENCES companies(id)
);

CREATE TABLE companyMeetingNotes (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  ...
  FOREIGN KEY (companyId) REFERENCES companies(id)
);
```

**制約**:
- `companyId`はNOT NULLで外部キー制約あり
- データ構造が明確に分離される

### 2. コードの再利用性

#### オプション1: 既存テーブル拡張

**メリット**:
- ✅ 組織用の既存ロジックを流用可能
- ✅ 共通の型定義を使用可能
- ✅ 共通のバリデーション関数を使用可能

**実装例**:
```typescript
// 共通の型定義
interface FocusInitiative {
  id: string;
  organizationId?: string;  // オプショナル
  companyId?: string;        // オプショナル
  title: string;
  // ...
}

// 共通の保存関数
async function saveFocusInitiative(initiative: FocusInitiative) {
  // organizationIdまたはcompanyIdのどちらかが必須
  if (!initiative.organizationId && !initiative.companyId) {
    throw new Error('organizationIdまたはcompanyIdが必要です');
  }
  // ...
}
```

#### オプション2: 新しいテーブル作成

**デメリット**:
- ❌ 組織用と事業会社用で似たようなコードを2つ書く必要がある
- ❌ 型定義も2つ必要（または共通化が必要）

**実装例**:
```typescript
// 組織用
interface FocusInitiative {
  id: string;
  organizationId: string;
  title: string;
  // ...
}

// 事業会社用（別の型定義が必要）
interface CompanyFocusInitiative {
  id: string;
  companyId: string;
  title: string;
  // ...
}

// 2つの保存関数が必要
async function saveFocusInitiative(initiative: FocusInitiative) { /* ... */ }
async function saveCompanyFocusInitiative(initiative: CompanyFocusInitiative) { /* ... */ }
```

### 3. クエリの複雑さ

#### オプション1: 既存テーブル拡張

**組織の注力施策を取得**:
```sql
SELECT * FROM focusInitiatives WHERE organizationId = ? AND companyId IS NULL;
```

**事業会社の注力施策を取得**:
```sql
SELECT * FROM focusInitiatives WHERE companyId = ? AND organizationId IS NULL;
```

**組織と事業会社の両方を取得**:
```sql
SELECT * FROM focusInitiatives 
WHERE (organizationId = ? OR companyId = ?);
```

**メリット**: 1つのテーブルから検索できるため、クエリがシンプル

#### オプション2: 新しいテーブル作成

**組織の注力施策を取得**:
```sql
SELECT * FROM focusInitiatives WHERE organizationId = ?;
```

**事業会社の注力施策を取得**:
```sql
SELECT * FROM companyFocusInitiatives WHERE companyId = ?;
```

**組織と事業会社の両方を取得**:
```sql
SELECT * FROM focusInitiatives WHERE organizationId = ?
UNION ALL
SELECT * FROM companyFocusInitiatives WHERE companyId = ?;
```

**デメリット**: UNIONが必要で、クエリが複雑になる

### 4. RAG検索の統合

#### オプション1: 既存テーブル拡張

**検索対象範囲の調整が容易**:

```typescript
async function searchFocusInitiatives(
  query: string,
  filters: {
    organizationId?: string;
    companyId?: string;
    searchScope?: 'organization' | 'company' | 'both';
  }
) {
  let whereClause = '';
  
  if (filters.searchScope === 'organization') {
    whereClause = 'organizationId = ? AND companyId IS NULL';
  } else if (filters.searchScope === 'company') {
    whereClause = 'companyId = ? AND organizationId IS NULL';
  } else if (filters.searchScope === 'both') {
    whereClause = '(organizationId = ? OR companyId = ?)';
  }
  
  // 1つのテーブルから検索
  return db.query(`SELECT * FROM focusInitiatives WHERE ${whereClause}`);
}
```

**メリット**: 検索ロジックがシンプルで、パフォーマンスも良い

#### オプション2: 新しいテーブル作成

**検索対象範囲の調整が複雑**:

```typescript
async function searchFocusInitiatives(
  query: string,
  filters: {
    organizationId?: string;
    companyId?: string;
    searchScope?: 'organization' | 'company' | 'both';
  }
) {
  const results = [];
  
  if (filters.searchScope === 'organization' || filters.searchScope === 'both') {
    const orgResults = await db.query(
      'SELECT * FROM focusInitiatives WHERE organizationId = ?',
      [filters.organizationId]
    );
    results.push(...orgResults);
  }
  
  if (filters.searchScope === 'company' || filters.searchScope === 'both') {
    const companyResults = await db.query(
      'SELECT * FROM companyFocusInitiatives WHERE companyId = ?',
      [filters.companyId]
    );
    results.push(...companyResults);
  }
  
  // 2つのテーブルから取得した結果を統合
  return results;
}
```

**デメリット**: 2つのテーブルから検索する必要があり、結果の統合も必要

### 5. ChromaDBとの統合

#### オプション1: 既存テーブル拡張

**コレクション構造**:
- 既存: `topics_{organizationId}` コレクション
- 拡張: `topics_{organizationId}` と `topics_company_{companyId}` の2パターン、または統合

**検討が必要な点**:
- 事業会社用のコレクションを別途作成するか
- 既存のコレクション構造を拡張するか

#### オプション2: 新しいテーブル作成

**コレクション構造**:
- 組織: `topics_{organizationId}` コレクション
- 事業会社: `topics_company_{companyId}` コレクション（新規作成）

**メリット**: コレクション構造が明確に分離される

### 6. データ整合性

#### オプション1: 既存テーブル拡張

**課題**:
- `organizationId`と`companyId`のどちらか一方が必ずNOT NULLである必要がある
- SQLiteではCHECK制約で実現可能

**解決策**:
```sql
ALTER TABLE focusInitiatives ADD CONSTRAINT chk_org_or_company 
CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR 
       (organizationId IS NULL AND companyId IS NOT NULL));
```

#### オプション2: 新しいテーブル作成

**メリット**:
- `companyId`はNOT NULLで外部キー制約あり
- データ整合性が明確

### 7. パフォーマンス

#### オプション1: 既存テーブル拡張

**インデックス**:
```sql
CREATE INDEX idx_focusInitiatives_organizationId ON focusInitiatives(organizationId);
CREATE INDEX idx_focusInitiatives_companyId ON focusInitiatives(companyId);
CREATE INDEX idx_focusInitiatives_org_company ON focusInitiatives(organizationId, companyId);
```

**メリット**: 1つのテーブルにインデックスを集中できる

#### オプション2: 新しいテーブル作成

**インデックス**:
```sql
CREATE INDEX idx_focusInitiatives_organizationId ON focusInitiatives(organizationId);
CREATE INDEX idx_companyFocusInitiatives_companyId ON companyFocusInitiatives(companyId);
```

**デメリット**: 2つのテーブルにインデックスを分散する必要がある

### 8. 既存データへの影響

#### オプション1: 既存テーブル拡張

**影響**:
- 既存の組織データに`companyId`がNULLとして追加される
- 既存のクエリは`companyId IS NULL`条件を追加する必要がある

**移行**:
```sql
-- 既存データは影響を受けない（companyIdはNULLのまま）
-- 既存のクエリを更新
-- 変更前: SELECT * FROM focusInitiatives WHERE organizationId = ?
-- 変更後: SELECT * FROM focusInitiatives WHERE organizationId = ? AND companyId IS NULL
```

#### オプション2: 新しいテーブル作成

**メリット**: 既存データへの影響なし

### 9. 保守性

#### オプション1: 既存テーブル拡張

**メリット**:
- ✅ 1つのテーブルを管理すればよい
- ✅ スキーマ変更が1箇所で済む
- ✅ バックアップ・リストアが簡単

#### オプション2: 新しいテーブル作成

**デメリット**:
- ❌ 2つのテーブルを管理する必要がある
- ❌ スキーマ変更が2箇所必要
- ❌ バックアップ・リストアが複雑

## 推奨: オプション1（既存テーブル拡張）

### 理由

1. **RAG検索の統合が容易**: 将来的に「組織だけ」「事業会社だけ」「組織＋事業会社」などの検索対象範囲を調整する際、1つのテーブルから検索する方が簡単でパフォーマンスも良い

2. **コードの再利用性**: 組織用の既存ロジックを流用できるため、開発効率が高い

3. **統一されたデータ構造**: 組織と事業会社で同じデータ構造を維持できる

4. **クエリの簡素化**: 1つのテーブルから検索できるため、クエリがシンプル

5. **保守性**: 1つのテーブルを管理すればよい

### 実装時の注意点

1. **データ整合性の確保**: CHECK制約で`organizationId`と`companyId`のどちらか一方が必ずNOT NULLであることを保証

2. **既存クエリの更新**: 既存の組織用クエリに`companyId IS NULL`条件を追加

3. **インデックスの最適化**: `organizationId`と`companyId`の両方にインデックスを追加

4. **型定義の拡張**: TypeScriptの型定義で`organizationId`と`companyId`をオプショナルにし、どちらか一方が必須であることをバリデーション

## 結論

オプション1（既存テーブル拡張）を推奨します。RAG検索の統合、コードの再利用性、保守性の観点から優れています。

ただし、データ整合性の確保と既存クエリの更新には注意が必要です。
