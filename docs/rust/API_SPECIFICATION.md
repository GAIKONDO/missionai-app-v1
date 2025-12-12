# API仕様書

> **📋 ステータス**: アクティブ（API仕様書）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: Rust APIサーバー（Axum）のエンドポイント仕様、リクエスト/レスポンス形式、エラーハンドリング

## 概要

このプロジェクトでは、**Axum**を使用してRESTful APIサーバーを実装しています。ポート`3011`で起動し、フロントエンドからHTTPリクエストを受け付けます。

## ベースURL

```
http://localhost:3011
```

**注意**: ポート番号は環境変数`API_SERVER_PORT`で変更可能（デフォルト: 3011）

## 共通仕様

### リクエスト形式

- **Content-Type**: `application/json`
- **エンコーディング**: UTF-8

### レスポンス形式

- **Content-Type**: `application/json`
- **エンコーディング**: UTF-8

### エラーレスポンス

```json
{
  "error": "エラーメッセージ"
}
```

**HTTPステータスコード**:
- `200 OK`: 成功
- `400 Bad Request`: リクエストが不正
- `404 Not Found`: リソースが見つからない
- `500 Internal Server Error`: サーバーエラー

### CORS設定

- **allow_origin**: `Any` - すべてのオリジンを許可（ローカル環境のみ）
- **allow_methods**: `Any` - すべてのHTTPメソッドを許可
- **allow_headers**: `Any` - すべてのヘッダーを許可

## エンドポイント一覧

### ヘルスチェック

#### `GET /health`

**説明**: APIサーバーの稼働状況を確認

**リクエスト**: なし

**レスポンス**:
```json
{
  "status": "ok",
  "message": "API server is running"
}
```

**ステータスコード**: `200 OK`

---

### 組織関連API

#### `GET /api/organizations`

**説明**: 組織一覧を取得

**クエリパラメータ**:
- `parent_id` (optional): 親組織IDでフィルタリング

**レスポンス**:
```json
[
  {
    "id": "org-uuid",
    "parentId": "parent-org-uuid",
    "name": "組織名",
    "title": "組織タイトル",
    "description": "説明",
    "level": 1,
    "levelName": "レベル名",
    "position": 0,
    "createdAt": "2025-01-15T00:00:00Z",
    "updatedAt": "2025-01-15T00:00:00Z"
  }
]
```

**ステータスコード**: `200 OK`

#### `POST /api/organizations`

**説明**: 組織を作成

**リクエストボディ**:
```json
{
  "parent_id": "parent-org-uuid",  // optional
  "name": "組織名",                 // required
  "title": "組織タイトル",          // optional
  "description": "説明",            // optional
  "level": 1,                      // optional, default: 0
  "level_name": "レベル名",         // optional, default: ""
  "position": 0                    // optional, default: 0
}
```

**レスポンス**: 作成された組織オブジェクト

**ステータスコード**: `200 OK`

#### `GET /api/organizations/:id`

**説明**: 指定されたIDの組織を取得

**パスパラメータ**:
- `id`: 組織ID

**レスポンス**: 組織オブジェクト

**ステータスコード**: `200 OK` または `404 Not Found`

#### `PUT /api/organizations/:id`

**説明**: 組織を更新

**パスパラメータ**:
- `id`: 組織ID

**リクエストボディ**:
```json
{
  "name": "組織名",        // optional
  "title": "組織タイトル", // optional
  "description": "説明",  // optional
  "position": 0           // optional
}
```

**レスポンス**: 更新された組織オブジェクト

**ステータスコード**: `200 OK`

#### `DELETE /api/organizations/:id`

**説明**: 組織を削除

**パスパラメータ**:
- `id`: 組織ID

**レスポンス**:
```json
{
  "message": "組織を削除しました"
}
```

**ステータスコード**: `200 OK`

#### `GET /api/organizations/:id/members`

**説明**: 組織のメンバー一覧を取得

**パスパラメータ**:
- `id`: 組織ID

**レスポンス**: メンバーオブジェクトの配列

**ステータスコード**: `200 OK`

#### `POST /api/organizations/:id/members`

**説明**: 組織にメンバーを追加

**パスパラメータ**:
- `id`: 組織ID

**リクエストボディ**:
```json
{
  "name": "メンバー名",
  "position": "役職",
  // その他のメンバー情報...
}
```

**レスポンス**: 作成されたメンバーオブジェクト

**ステータスコード**: `200 OK`

#### `PUT /api/organizations/:id/members/:member_id`

**説明**: 組織のメンバーを更新

**パスパラメータ**:
- `id`: 組織ID
- `member_id`: メンバーID

**リクエストボディ**: 更新するメンバー情報

**レスポンス**: 更新されたメンバーオブジェクト

**ステータスコード**: `200 OK`

#### `DELETE /api/organizations/:id/members/:member_id`

**説明**: 組織のメンバーを削除

**パスパラメータ**:
- `id`: 組織ID
- `member_id`: メンバーID

**レスポンス**:
```json
{
  "message": "メンバーを削除しました"
}
```

**ステータスコード**: `200 OK`

#### `GET /api/organizations/tree`

**説明**: 組織ツリーを取得

**クエリパラメータ**:
- `root_id` (optional): ルート組織ID

**レスポンス**: 組織ツリーの配列

**ステータスコード**: `200 OK`

#### `GET /api/organizations/search`

**説明**: 組織を検索

**クエリパラメータ**:
- `name` (required): 検索クエリ（組織名で検索）

**レスポンス**: 検索結果の組織配列

**ステータスコード**: `200 OK` または `400 Bad Request`（nameパラメータが不足している場合）

---

### 事業会社関連API

#### `GET /api/companies`

**説明**: 事業会社一覧を取得

**レスポンス**: 事業会社オブジェクトの配列

**ステータスコード**: `200 OK`

#### `POST /api/companies`

**説明**: 事業会社を作成

**リクエストボディ**:
```json
{
  "code": "会社コード",         // required
  "name": "会社名",             // required
  "name_short": "略称",         // optional
  "category": "カテゴリ",       // required
  "organization_id": "org-id",  // required
  "company": "会社名",          // optional
  "division": "部門名",         // optional
  "department": "部署名",        // optional
  "region": "地域",             // optional, default: "JP"
  "position": 0                 // optional, default: 0
}
```

**レスポンス**: 作成された事業会社オブジェクト

**ステータスコード**: `200 OK`

#### `GET /api/companies/:id`

**説明**: 指定されたIDの事業会社を取得

**パスパラメータ**:
- `id`: 事業会社ID

**レスポンス**: 事業会社オブジェクト

**ステータスコード**: `200 OK` または `404 Not Found`

#### `PUT /api/companies/:id`

**説明**: 事業会社を更新

**パスパラメータ**:
- `id`: 事業会社ID

**リクエストボディ**: 更新する事業会社情報

**レスポンス**: 更新された事業会社オブジェクト

**ステータスコード**: `200 OK`

#### `DELETE /api/companies/:id`

**説明**: 事業会社を削除

**パスパラメータ**:
- `id`: 事業会社ID

**レスポンス**:
```json
{
  "message": "事業会社を削除しました"
}
```

**ステータスコード**: `200 OK`

#### `GET /api/companies/code/:code`

**説明**: 会社コードで事業会社を取得

**パスパラメータ**:
- `code`: 会社コード

**レスポンス**: 事業会社オブジェクト

**ステータスコード**: `200 OK` または `404 Not Found`

#### `GET /api/companies/organization/:org_id`

**説明**: 組織に紐づく事業会社一覧を取得

**パスパラメータ**:
- `org_id`: 組織ID

**レスポンス**: 事業会社オブジェクトの配列

**ステータスコード**: `200 OK`

---

### 組織と事業会社の表示関係API

#### `GET /api/organization-company-displays`

**説明**: すべての組織と事業会社の表示関係を取得

**レスポンス**: 表示関係オブジェクトの配列

**ステータスコード**: `200 OK`

#### `POST /api/organization-company-displays`

**説明**: 組織と事業会社の表示関係を作成

**リクエストボディ**:
```json
{
  "organizationId": "org-id",
  "companyId": "company-id",
  "displayOrder": 0
}
```

**レスポンス**: 作成された表示関係オブジェクト

**ステータスコード**: `200 OK`

#### `GET /api/organization-company-displays/organization/:org_id`

**説明**: 組織に紐づく事業会社一覧を取得（表示関係経由）

**パスパラメータ**:
- `org_id`: 組織ID

**レスポンス**: 事業会社オブジェクトの配列

**ステータスコード**: `200 OK`

#### `GET /api/organization-company-displays/company/:company_id`

**説明**: 事業会社に紐づく組織一覧を取得（表示関係経由）

**パスパラメータ**:
- `company_id`: 事業会社ID

**レスポンス**: 組織オブジェクトの配列

**ステータスコード**: `200 OK`

#### `PUT /api/organization-company-displays/:id/order`

**説明**: 表示順序を更新

**パスパラメータ**:
- `id`: 表示関係ID

**リクエストボディ**:
```json
{
  "displayOrder": 1
}
```

**レスポンス**: 更新された表示関係オブジェクト

**ステータスコード**: `200 OK`

#### `DELETE /api/organization-company-displays/:id`

**説明**: 表示関係を削除

**パスパラメータ**:
- `id`: 表示関係ID

**レスポンス**:
```json
{
  "message": "表示関係を削除しました"
}
```

**ステータスコード**: `200 OK`

#### `DELETE /api/organization-company-displays/organization/:org_id/company/:company_id`

**説明**: 組織と事業会社の表示関係を削除（ID指定）

**パスパラメータ**:
- `org_id`: 組織ID
- `company_id`: 事業会社ID

**レスポンス**:
```json
{
  "message": "表示関係を削除しました"
}
```

**ステータスコード**: `200 OK`

---

### リレーション関連API

#### `GET /api/relations`

**説明**: リレーション一覧を取得

**レスポンス**: リレーションオブジェクトの配列

**ステータスコード**: `200 OK`

#### `POST /api/relations`

**説明**: リレーションを作成

**リクエストボディ**:
```json
{
  "id": "relation-id",           // optional（未指定の場合は自動生成）
  "topicId": "topic-id",         // optional
  "sourceEntityId": "entity-id", // optional
  "targetEntityId": "entity-id", // optional
  "relationType": "関係タイプ",   // optional
  "description": "説明",         // optional
  "confidence": 0.9,             // optional
  "organizationId": "org-id",     // optional
  "metadata": {}                 // optional
}
```

**レスポンス**: 作成されたリレーションオブジェクト（`id`フィールドを含む）

**ステータスコード**: `200 OK`

**注意**: `id`が指定されていない場合、自動的に生成されます（`relation_{timestamp}_{uuid}`形式）

#### `GET /api/relations/:id`

**説明**: 指定されたIDのリレーションを取得

**パスパラメータ**:
- `id`: リレーションID

**レスポンス**: リレーションオブジェクト

**ステータスコード**: `200 OK` または `404 Not Found`

#### `PUT /api/relations/:id`

**説明**: リレーションを更新

**パスパラメータ**:
- `id`: リレーションID

**リクエストボディ**: 更新するリレーション情報

**レスポンス**: 更新されたリレーションオブジェクト

**ステータスコード**: `200 OK`

#### `DELETE /api/relations/:id`

**説明**: リレーションを削除

**パスパラメータ**:
- `id`: リレーションID

**レスポンス**:
```json
{
  "message": "リレーションを削除しました"
}
```

**ステータスコード**: `200 OK`

---

### エンティティ関連API

#### `GET /api/entities`

**説明**: エンティティ一覧を取得

**レスポンス**: エンティティオブジェクトの配列

**ステータスコード**: `200 OK`

#### `POST /api/entities`

**説明**: エンティティを作成

**リクエストボディ**:
```json
{
  "id": "entity-id",                    // optional（未指定の場合は自動生成）
  "name": "エンティティ名",              // optional
  "type": "エンティティタイプ",          // optional
  "aliases": ["エイリアス1", "エイリアス2"], // optional（JSON文字列または配列）
  "metadata": {},                       // optional（JSON文字列またはオブジェクト）
  "organizationId": "org-id"            // optional
}
```

**レスポンス**: 作成されたエンティティオブジェクト（`id`フィールドを含む、`aliases`と`metadata`はオブジェクト形式で返される）

**ステータスコード**: `200 OK`

**注意**: 
- `id`が指定されていない場合、自動的に生成されます
- `aliases`と`metadata`はJSON文字列として保存されますが、レスポンスではオブジェクト形式で返されます

#### `GET /api/entities/:id`

**説明**: 指定されたIDのエンティティを取得

**パスパラメータ**:
- `id`: エンティティID

**レスポンス**: エンティティオブジェクト

**ステータスコード**: `200 OK` または `404 Not Found`

#### `PUT /api/entities/:id`

**説明**: エンティティを更新

**パスパラメータ**:
- `id`: エンティティID

**リクエストボディ**: 更新するエンティティ情報

**レスポンス**: 更新されたエンティティオブジェクト

**ステータスコード**: `200 OK`

#### `DELETE /api/entities/:id`

**説明**: エンティティを削除

**パスパラメータ**:
- `id`: エンティティID

**レスポンス**:
```json
{
  "message": "エンティティを削除しました"
}
```

**ステータスコード**: `200 OK`

---

## 使用例

### 組織の作成と取得

```typescript
// 組織を作成
const response = await fetch('http://localhost:3011/api/organizations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: '新規組織',
    level: 1,
    level_name: '部門',
  }),
});

const organization = await response.json();

// 組織を取得
const getResponse = await fetch(`http://localhost:3011/api/organizations/${organization.id}`);
const org = await getResponse.json();
```

### 組織ツリーの取得

```typescript
const response = await fetch('http://localhost:3011/api/organizations/tree');
const tree = await response.json();
```

### エラーハンドリング

```typescript
try {
  const response = await fetch('http://localhost:3011/api/organizations/invalid-id');
  
  if (!response.ok) {
    const error = await response.json();
    console.error('エラー:', error.error);
  }
} catch (error) {
  console.error('ネットワークエラー:', error);
}
```

## 関連ドキュメント

- [Rust/Tauri設定](./RUST_TAURI_CONFIGURATION.md)
- [ポート設計とサーバー構成](../architecture/port-and-server-design.md)
- [React設定](../react/REACT_CONFIGURATION.md)

---

最終更新: 2025-12-11
