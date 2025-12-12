# メンバーと組織マスターテーブルの紐づけ設計案

> **📋 ステータス**: 設計案（未実装）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: メンバーと組織マスターテーブルの紐づけ設計案の記録  
> **⚠️ 注意**: このドキュメントは**設計案**です。現在の実装では**UUID形式を継続**しています。  
> 実装状況については [`ORGANIZATION_ID_DESIGN_COMPARISON.md`](./ORGANIZATION_ID_DESIGN_COMPARISON.md) を参照してください。

## 📋 現状の整理

### 現在のテーブル構造

1. **`organizations`テーブル**（⭐ **主テーブル** - 継続使用）
   - `id` (TEXT, PRIMARY KEY) - UUID形式
   - `parentId` (TEXT) - 親組織ID
   - `name`, `title`, `description`, `level`, `levelName`, `position`など

2. **`organization_master`テーブル**（補助テーブル - CSVマスターデータ用）
   - `id` (TEXT, PRIMARY KEY) - UUID形式
   - `code` (TEXT, UNIQUE, NOT NULL) - 組織コード（例: "C0S", "8N", "B2", "S327"）
   - `parent_code` (TEXT) - 親組織コード（`organization_master(code)`を参照）
   - `hierarchy_level` (INTEGER) - 階層レベル（1=会社, 2=部門, 3=部, 4=課）
   - `hierarchy_type` (TEXT) - 階層タイプ（"company", "division", "department", "section"）
   - その他多数の属性フィールド

3. **`organizationMembers`テーブル**（メンバーテーブル）
   - `id` (TEXT, PRIMARY KEY) - メンバーのUUID
   - `organizationId` (TEXT, NOT NULL) - **`organizations(id)`を参照（UUID形式）** ⭐ **現在の実装**
   - `name`, `position`, `nameRomaji`, `department`など

## 🎯 設計の目的

- **UUID形式を継続**: 既存の実装を維持しつつ、組織マスターデータを活用
- **組織コードからのUUID取得**: CSVインポート時は組織コードからUUIDを取得して使用
- **段階的な移行**: 必要に応じて組織コードで検索可能な関数を提供

## 💡 設計案（一元化版）

### 🏆 採用案: `organizationId`を`organization_master_code`に変更

**概要**: `organizationMembers.organizationId`を組織コード（`organization_master(code)`）を格納するカラムに変更し、`organization_master`テーブルを唯一の組織データソースとする。

**方針**:
- ✅ **一元化**: `organization_master`テーブルのみを使用
- ✅ **組織コードでの紐づけ**: `organizationId`に組織コード（"S327"など）を格納
- ✅ **シンプルな構造**: 1つのカラムのみで管理
- ✅ **可読性**: 組織コードは人間が読みやすく、デバッグしやすい

**テーブル定義**:
```sql
-- 1. 外部キー制約を削除（既存のorganizations(id)への参照を解除）
-- SQLiteでは外部キー制約の削除は直接できないため、
-- テーブル再作成または制約を無視して進める

-- 2. organizationIdカラムの意味を変更
-- organizationIdに組織コード（organization_master.code）を格納
-- 例: 'S327', 'B2', '8N', 'C0S' など

-- 3. インデックスを作成（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_organizationMembers_organizationId 
ON organizationMembers(organizationId);

-- 4. 外部キー制約を追加（organization_master(code)への参照）
-- 注意: SQLiteでは外部キー制約はPRAGMA foreign_keys = ONが必要
-- FOREIGN KEY (organizationId) REFERENCES organization_master(code)
```

**データ構造**:
```rust
// Rust構造体
pub struct OrganizationMember {
    pub id: String,
    pub organization_id: String, // 組織コード（"S327", "B2", "8N", "C0S"など）を格納
    pub name: String,
    pub position: Option<String>,
    // ... その他のフィールド
}

// メンバー取得関数（組織コードで検索）
pub fn get_members_by_organization_code(code: &str) -> SqlResult<Vec<OrganizationMember>> {
    // organizationIdで検索（組織コードで検索）
    // WHERE organizationId = code
    // 組織コードは階層レベルに関係なくユニークなので、どの階層レベルでも検索可能
}

// 組織情報を取得（階層レベルも含む）
pub fn get_organization_info_by_code(code: &str) -> SqlResult<OrganizationMaster> {
    // organization_masterテーブルから組織コードで検索
    // hierarchy_level, hierarchy_typeも取得可能
}
```

**使用例**:
```rust
// 現場メンバーを課レベルに紐づける
INSERT INTO organizationMembers (
    id, organizationId, name, position, ...
) VALUES (
    'member-uuid-1', 'S327', '山田太郎', '課長', ...
);

// 役職者を部レベルに紐づける
INSERT INTO organizationMembers (
    id, organizationId, name, position, ...
) VALUES (
    'member-uuid-2', 'B2', '佐藤部長', '部長', ...
);

// 役職者を部門レベルに紐づける
INSERT INTO organizationMembers (
    id, organizationId, name, position, ...
) VALUES (
    'member-uuid-3', '8N', '鈴木部門長', '部門長', ...
);

// 役職者をカンパニーレベルに紐づける
INSERT INTO organizationMembers (
    id, organizationId, name, position, ...
) VALUES (
    'member-uuid-4', 'C0S', '田中社長', '社長', ...
);

// 組織コードでメンバーを検索（どの階層レベルでも検索可能）
SELECT * FROM organizationMembers 
WHERE organizationId = 'S327';  -- 課レベル
SELECT * FROM organizationMembers 
WHERE organizationId = 'B2';     -- 部レベル
SELECT * FROM organizationMembers 
WHERE organizationId = '8N';     -- 部門レベル
SELECT * FROM organizationMembers 
WHERE organizationId = 'C0S';   -- カンパニーレベル

// 組織情報と階層レベルを取得
SELECT om.*, master.hierarchy_level, master.hierarchy_type, master.name_kanji
FROM organizationMembers om
JOIN organization_master master ON om.organizationId = master.code
WHERE om.organizationId = 'S327';
```

### 移行戦略

1. **Phase 1**: 既存データの移行準備
   - `organizations`テーブルと`organization_master`テーブルのマッピングを作成
   - 既存の`organizationId`（UUID）から組織コードへの変換マッピング

2. **Phase 2**: データ移行
   - 既存の`organizationMembers.organizationId`をUUIDから組織コードに変換
   - 移行スクリプトを実行

3. **Phase 3**: 外部キー制約の追加
   - `organization_master(code)`への外部キー制約を追加
   - データ整合性を保証

4. **Phase 4**: コード更新
   - メンバー作成・更新・取得関数を更新
   - 組織コードベースのAPIに変更

5. **Phase 5**: `organizations`テーブルの廃止（将来的に）
   - 他のテーブルとの依存関係を確認
   - 段階的に`organizations`テーブルへの参照を削除

---

## 📊 テーブル関係図（一元化後）

```
organization_master (⭐ 唯一の組織マスターテーブル)
    ├── id (UUID)
    ├── code (UNIQUE, "S327"など) ⭐
    └── parent_code → organization_master(code)

organizationMembers (メンバーテーブル)
    ├── id (UUID)
    ├── organizationId → organization_master(code) ⭐ [組織コードを格納]
    └── name, position, ...

organizations (⚠️ 将来的に廃止予定)
    └── [他のテーブルとの依存関係を確認後、段階的に廃止]
```

### データフロー

```
メンバー追加時:
1. ユーザーが組織コード（"S327"など）を選択
2. organization_masterテーブルで組織コードを検証
3. organizationMembersテーブルに組織コードを格納

メンバー取得時:
1. organizationId（組織コード）で検索
2. organization_masterテーブルとJOINして組織情報を取得
```

---

## 🔍 考慮事項

### 1. 外部キー制約について

- **推奨**: `organization_master(code)`への外部キー制約を追加してデータ整合性を保証
- **注意**: SQLiteでは外部キー制約は`PRAGMA foreign_keys = ON`が必要
- **実装**: アプリケーション起動時に`PRAGMA foreign_keys = ON`を実行

### 2. インデックス

- `organizationId`（組織コード）にインデックスを追加して検索性能を向上
- `organization_master.code`は既に`UNIQUE`制約があるため、インデックスが自動的に作成される

### 3. データ整合性

- メンバー追加時は、指定された組織コードが`organization_master`テーブルに存在することを確認
- 存在しない組織コードの場合はエラーを返す

### 4. データ移行

- **重要**: 既存の`organizationId`（UUID）から組織コードへの変換が必要
- `organizations`テーブルと`organization_master`テーブルのマッピングを作成
- 移行スクリプトで一括変換を実行

### 5. 階層レベルの考慮 ⭐ **重要**

- **メンバーの所属階層レベルは柔軟に対応**
  - **現場メンバー**: 課レベル（`hierarchy_level = 4`, `hierarchy_type = "section"`）に紐づける
    - 例: 組織コード "S327"（ＩＴビジネス課）
  - **役職者**: 部、部門、カンパニーレベルにも紐づけ可能
    - 部レベル: `hierarchy_level = 3`, `hierarchy_type = "department"`
      - 例: 組織コード "B2"（情報産業ビジネス部）
    - 部門レベル: `hierarchy_level = 2`, `hierarchy_type = "division"`
      - 例: 組織コード "8N"（情報・通信部門）
    - カンパニーレベル: `hierarchy_level = 1`, `hierarchy_type = "company"`
      - 例: 組織コード "C0S"（情報・金融カンパニー）

- **実装方法**:
  - `organizationId`に組織コードを格納するだけで、階層レベルは自動的に特定可能
  - `organization_master`テーブルで組織コードを検索すると、`hierarchy_level`と`hierarchy_type`が取得できる
  - 追加のカラムは不要（組織コードだけで階層レベルも特定可能）

- **使用例**:
  ```rust
  // 現場メンバー（課レベル）
  INSERT INTO organizationMembers (id, organizationId, name, ...)
  VALUES ('member-1', 'S327', '山田太郎', ...);

  // 役職者（部レベル）
  INSERT INTO organizationMembers (id, organizationId, name, ...)
  VALUES ('member-2', 'B2', '佐藤部長', ...);

  // 役職者（部門レベル）
  INSERT INTO organizationMembers (id, organizationId, name, ...)
  VALUES ('member-3', '8N', '鈴木部門長', ...);

  // 役職者（カンパニーレベル）
  INSERT INTO organizationMembers (id, organizationId, name, ...)
  VALUES ('member-4', 'C0S', '田中社長', ...);
  ```

### 6. 複数所属の対応

- 1人のメンバーが複数の組織に所属する場合
  - **案A**: 複数のレコードを作成（1組織 = 1レコード）
  - **案B**: `organizationIds`カラムを追加してカンマ区切りで複数組織を格納（非推奨）
  - **推奨**: 案A（正規化された構造）

---

## 📝 実装時のチェックリスト

### Phase 1: データ移行準備
- [ ] `organizations`テーブルと`organization_master`テーブルのマッピングを作成
- [ ] 既存の`organizationId`（UUID）から組織コードへの変換マッピングを作成
- [ ] データ移行スクリプトを作成・テスト

### Phase 2: テーブル構造変更
- [ ] `organizationMembers.organizationId`の意味を変更（UUID → 組織コード）
- [ ] 外部キー制約を削除（既存の`organizations(id)`への参照）
- [ ] インデックスを作成（`organizationId`にインデックス）
- [ ] 外部キー制約を追加（`organization_master(code)`への参照）

### Phase 3: コード更新
- [ ] Rust構造体`OrganizationMember`を更新（`organization_id`の型・意味を変更）
- [ ] メンバー作成関数を更新（組織コードを受け取る、任意の階層レベルに対応）
- [ ] メンバー更新関数を更新（組織コードで検索・更新）
- [ ] メンバー取得関数を更新（組織コードで検索、階層レベルに関係なく検索可能）
- [ ] 組織コードの存在確認関数を追加（任意の階層レベルで検証可能）
- [ ] 階層レベル別のメンバー取得関数を追加（オプション）
  - `get_members_by_hierarchy_level(level: i32)` - 特定の階層レベルのメンバーを取得
  - `get_members_by_hierarchy_type(type: &str)` - 特定の階層タイプのメンバーを取得

### Phase 4: API更新
- [ ] Tauriコマンドを更新（組織コードベースのAPI）
- [ ] フロントエンドのAPI呼び出しを更新
- [ ] UIで組織コードを選択・表示する機能を追加

### Phase 5: データ移行実行
- [ ] 既存データのバックアップを作成
- [ ] データ移行スクリプトを実行
- [ ] 移行後のデータ整合性を確認

### Phase 6: テスト・検証
- [ ] メンバー追加・更新・削除のテスト
- [ ] 組織コードでの検索テスト
- [ ] 外部キー制約の動作確認
- [ ] パフォーマンステスト

---

## ❓ 決定事項

1. ✅ **一元化**: `organization_master`テーブルのみを使用（`organizations`テーブルは将来的に廃止）
2. ✅ **組織コードでの紐づけ**: `organizationId`に組織コード（`organization_master.code`）を格納
3. ⚠️ **階層レベル**: メンバーはどの階層レベルに紐づけるか？（推奨: 課レベル）
4. ⚠️ **複数所属**: 1人のメンバーが複数の組織に所属する場合の対応（推奨: 複数レコード作成）

---

## 🔄 移行スクリプトのイメージ

```rust
// 既存のorganizationId（UUID）から組織コードへの変換
pub fn migrate_organization_ids_to_codes() -> SqlResult<()> {
    // 1. organizationsテーブルとorganization_masterテーブルのマッピングを作成
    // 2. organizationMembersのorganizationIdをUUIDから組織コードに変換
    // 3. 変換できない場合はエラーログを出力
}
```

