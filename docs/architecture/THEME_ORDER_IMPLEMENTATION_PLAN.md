# テーマ順序変更機能 実装計画

## 概要

ダッシュボードと分析ページのテーマの順序を変更できるようにする。順序変更は分析ページのテーマ編集モーダルでドラッグ&ドロップで行えるようにする。

## 現在の状況

### データベーススキーマ
- `themes`テーブルに`position`カラムが存在しない
- 現在は`ORDER BY createdAt DESC, title ASC`でソート

### フロントエンド
- `@dnd-kit/core`と`@dnd-kit/sortable`が既にインストール済み
- テーマ編集モーダルは存在するが、順序変更機能がない

### バックエンド
- `Theme`構造体に`position`フィールドがない
- `get_all_themes()`が`position`でソートしていない

## 実装ステップ

### 1. データベーススキーマの変更

#### 1.1 マイグレーション処理の追加
`src-tauri/src/database/mod.rs`の`init_tables()`関数内で、`themes`テーブルに`position`カラムを追加するマイグレーションを実装。

```rust
// themesテーブルの作成後に追加
// positionカラムが存在しない場合に追加
let position_exists: bool = conn.query_row(
    "SELECT COUNT(*) FROM pragma_table_info('themes') WHERE name = 'position'",
    [],
    |row| Ok(row.get::<_, i32>(0)? > 0),
).unwrap_or(false);

if !position_exists {
    init_log!("🔧 themesテーブルにpositionカラムを追加します...");
    
    // トランザクション内で実行（安全性のため）
    let tx = conn.unchecked_transaction()?;
    
    // カラム追加
    tx.execute(
        "ALTER TABLE themes ADD COLUMN position INTEGER",
        [],
    )?;
    
    // 既存データにpositionを設定（createdAt順に連番を割り当て）
    // ROW_NUMBER()を使用してより安全に実装
    tx.execute(
        "UPDATE themes SET position = (
            SELECT rn FROM (
                SELECT id, ROW_NUMBER() OVER (ORDER BY createdAt DESC, title ASC) as rn
                FROM themes
            ) ranked
            WHERE ranked.id = themes.id
        )",
        [],
    )?;
    
    // positionカラムにインデックスを追加（パフォーマンス向上）
    tx.execute(
        "CREATE INDEX IF NOT EXISTS idx_themes_position ON themes(position)",
        [],
    )?;
    
    tx.commit()?;
    init_log!("✅ positionカラムの追加と初期値設定が完了しました");
}
```

#### 1.2 テーブル作成SQLの更新
`init_tables()`内の`CREATE TABLE IF NOT EXISTS themes`を更新（新規インストール用）。

```sql
CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    initiativeIds TEXT,
    position INTEGER,
    createdAt TEXT,
    updatedAt TEXT
)
```

### 2. Rust側の変更

#### 2.1 `Theme`構造体の更新
`src-tauri/src/database/themes.rs`の`Theme`構造体に`position`フィールドを追加。

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "initiativeIds")]
    pub initiative_ids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "createdAt")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<String>,
}
```

#### 2.2 `get_all_themes()`の更新
`position`でソートするように変更。

```rust
let mut stmt = conn.prepare(
    "SELECT id, title, description, initiativeIds, position, createdAt, updatedAt
     FROM themes
     ORDER BY COALESCE(position, 999999) ASC, createdAt DESC, title ASC"
)?;
```

#### 2.3 `get_theme_by_id()`の更新
`position`を含めて取得。

```rust
conn.query_row(
    "SELECT id, title, description, initiativeIds, position, createdAt, updatedAt
     FROM themes WHERE id = ?1",
    params![id],
    |row| {
        // ... initiativeIdsの処理 ...
        Ok(Theme {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            initiative_ids,
            position: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    },
)
```

#### 2.4 `save_theme()`の更新
`position`を含めて保存。

```rust
// 新規作成時
conn.execute(
    "INSERT INTO themes (id, title, description, initiativeIds, position, createdAt, updatedAt)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    params![
        theme.id,
        theme.title,
        theme.description,
        initiative_ids_json,
        theme.position,
        now,
        now,
    ],
)?;

// 更新時
conn.execute(
    "UPDATE themes SET title = ?1, description = ?2, initiativeIds = ?3, position = ?4, updatedAt = ?5
     WHERE id = ?6",
    params![
        theme.title,
        theme.description,
        initiative_ids_json,
        theme.position,
        now,
        theme.id,
    ],
)?;
```

#### 2.5 テーマ順序一括更新関数の追加
`src-tauri/src/database/themes.rs`に新規関数を追加。

```rust
/// 複数のテーマのpositionを一括更新
pub fn update_theme_positions(updates: &[(String, i32)]) -> SqlResult<()> {
    let db = get_db().ok_or_else(|| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
            Some("データベースが初期化されていません".to_string()),
        )
    })?;

    let conn = db.get_connection()?;
    let tx = conn.unchecked_transaction()?;
    let now = get_timestamp();

    // 各テーマのpositionを更新
    for (theme_id, position) in updates {
        tx.execute(
            "UPDATE themes SET position = ?1, updatedAt = ?2 WHERE id = ?3",
            params![position, now, theme_id],
        )?;
    }

    // 更新後にpositionを正規化（1から始まる連番に）
    // これにより、削除や手動変更による不整合を防ぐ
    tx.execute(
        "UPDATE themes SET position = (
            SELECT rn FROM (
                SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC, createdAt DESC, title ASC) as rn
                FROM themes
            ) ranked
            WHERE ranked.id = themes.id
        )",
        [],
    )?;

    tx.commit()?;
    Ok(())
}
```

#### 2.6 Tauriコマンドの追加
`src-tauri/src/commands/organization.rs`（または適切な場所）にコマンドを追加。

```rust
#[tauri::command]
pub async fn update_theme_positions_cmd(
    updates: Vec<(String, i32)>,
) -> Result<(), String> {
    themes::update_theme_positions(&updates)
        .map_err(|e| format!("テーマ順序の更新に失敗しました: {}", e))?;
    Ok(())
}
```

### 3. TypeScript側の変更

#### 3.1 `Theme`インターフェースの更新
`lib/orgApi.ts`の`Theme`インターフェースに`position`を追加。

```typescript
export interface Theme {
  id: string;
  title: string;
  description?: string;
  initiativeIds?: string[]; // 関連する注力施策のIDリスト
  position?: number; // 表示順序
  createdAt?: any;
  updatedAt?: any;
}
```

#### 3.2 `getThemes()`の更新
`position`を含めて取得（既に含まれているはずだが確認）。

#### 3.3 テーマ順序一括更新関数の追加
`lib/orgApi.ts`に新規関数を追加。

```typescript
/**
 * 複数のテーマのpositionを一括更新
 */
export async function updateThemePositions(
  updates: Array<{ themeId: string; position: number }>
): Promise<void> {
  try {
    console.log('🔄 [updateThemePositions] 開始:', updates.length, '件');
    
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('./localFirebase');
      
      // Tauriコマンド経由で更新
      const updatesArray = updates.map(u => [u.themeId, u.position] as [string, number]);
      await callTauriCommand('update_theme_positions_cmd', {
        updates: updatesArray,
      });
      
      console.log('✅ [updateThemePositions] 更新完了');
    } else {
      // フォールバック: Rust API経由
      const { apiPost } = await import('./apiClient');
      await apiPost('/api/themes/positions', { updates });
    }
  } catch (error: any) {
    console.error('❌ [updateThemePositions] 更新に失敗しました:', error);
    throw error;
  }
}
```

### 4. 分析ページのUI変更

#### 4.1 ドラッグ&ドロップ機能の実装
`app/analytics/page.tsx`のテーマ一覧編集モーダルに`@dnd-kit`を使用してドラッグ&ドロップ機能を追加。

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

#### 4.2 状態管理の追加
テーマの順序を管理するための状態を追加。

```typescript
const [orderedThemes, setOrderedThemes] = useState<Theme[]>([]);

// themesが変更されたときにorderedThemesを更新
useEffect(() => {
  // positionでソート（positionがnullの場合は最後に）
  const sorted = [...themes].sort((a, b) => {
    const posA = a.position ?? 999999;
    const posB = b.position ?? 999999;
    return posA - posB;
  });
  setOrderedThemes(sorted);
}, [themes]);
```

#### 4.3 ドラッグ&ドロップハンドラーの実装

```typescript
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  
  if (over && active.id !== over.id) {
    // 現在のテーマリストを取得（最新の状態を確認）
    const currentThemes = await getThemes();
    const currentThemeIds = currentThemes.map(t => t.id);
    const originalThemeIds = orderedThemes.map(t => t.id);
    
    // テーマが追加/削除されていないか確認（楽観的ロック）
    if (currentThemeIds.length !== originalThemeIds.length ||
        !currentThemeIds.every((id, index) => id === originalThemeIds[index])) {
      // テーマリストが変更されている場合は警告を表示
      alert('テーマリストが更新されました。ページをリロードしてください。');
      await refreshThemes();
      return;
    }
    
    const oldIndex = orderedThemes.findIndex(t => t.id === active.id);
    const newIndex = orderedThemes.findIndex(t => t.id === over.id);
    
    // 一時的にUIを更新（楽観的更新）
    const newOrderedThemes = arrayMove(orderedThemes, oldIndex, newIndex);
    setOrderedThemes(newOrderedThemes);
    
    // positionを更新（1から始まる連番）
    const updates = newOrderedThemes.map((theme, index) => ({
      themeId: theme.id,
      position: index + 1,
    }));
    
    try {
      await updateThemePositions(updates);
      // テーマリストを再読み込み（サーバー側で正規化されたpositionを取得）
      await refreshThemes();
    } catch (error) {
      console.error('テーマ順序の更新に失敗しました:', error);
      // エラー時は元に戻す
      setOrderedThemes(orderedThemes);
      alert('テーマ順序の更新に失敗しました。ページをリロードしてください。');
      // テーマリストを再読み込み
      await refreshThemes();
    }
  }
};
```

#### 4.4 SortableItemコンポーネントの作成

```typescript
function SortableThemeItem({ theme, onEdit, onDelete }: {
  theme: Theme;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: theme.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '16px',
        border: '1px solid #E0E0E0',
        borderRadius: '8px',
        marginBottom: '12px',
        backgroundColor: '#FAFAFA',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
      }}>
        {/* ドラッグハンドル */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            color: '#6B7280',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M7 5h6M7 10h6M7 15h6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        {/* テーマ情報 */}
        <div style={{ flex: 1 }}>
          {/* ... 既存のテーマ情報表示 ... */}
        </div>
        
        {/* 編集・削除ボタン */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* ... 既存のボタン ... */}
        </div>
      </div>
    </div>
  );
}
```

#### 4.5 モーダル内のリストをDndContextでラップ

```typescript
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={orderedThemes.map(t => t.id)}
    strategy={verticalListSortingStrategy}
  >
    {orderedThemes.map((theme) => (
      <SortableThemeItem
        key={theme.id}
        theme={theme}
        onEdit={() => {
          setEditingTheme(theme);
          setThemeFormTitle(theme.title);
          setThemeFormDescription(theme.description || '');
          setShowEditThemesModal(false);
          setShowThemeModal(true);
        }}
        onDelete={() => {
          setThemeToDelete(theme);
          setShowDeleteModal(true);
        }}
      />
    ))}
  </SortableContext>
</DndContext>
```

### 5. ダッシュボードの変更

#### 5.1 テーマの順序をpositionでソート
`app/page.tsx`の`filteredThemes`を`position`でソート。

```typescript
const filteredThemes = useMemo(() => {
  let result = filteredThemeIds.size === 0 
    ? themes 
    : themes.filter(theme => filteredThemeIds.has(theme.id));
  
  // positionでソート（positionがnullの場合は最後に）
  result = [...result].sort((a, b) => {
    const posA = a.position ?? 999999;
    const posB = b.position ?? 999999;
    return posA - posB;
  });
  
  return result;
}, [themes, filteredThemeIds]);
```

## 実装の優先順位

1. **Phase 1: データベーススキーマ変更**
   - マイグレーション処理の追加
   - `Theme`構造体の更新
   - `get_all_themes()`の更新

2. **Phase 2: バックエンドAPI**
   - `save_theme()`の更新
   - `update_theme_positions()`関数の追加
   - Tauriコマンドの追加

3. **Phase 3: フロントエンドAPI**
   - `Theme`インターフェースの更新
   - `updateThemePositions()`関数の追加

4. **Phase 4: UI実装**
   - ドラッグ&ドロップ機能の追加
   - ダッシュボードでの順序反映

## 注意事項

1. **既存データの互換性**: `position`が`NULL`の場合は既存のソート順（`createdAt DESC, title ASC`）を使用
2. **エラーハンドリング**: ドラッグ&ドロップ時のエラーは元の順序に戻す
3. **パフォーマンス**: 一括更新APIを使用して、複数の更新を1つのトランザクションで処理
4. **UI/UX**: ドラッグ中は視覚的なフィードバックを提供（透明度変更など）
5. **同時更新の対策**: 楽観的ロックを実装して、他のユーザーによる変更を検出
6. **データ整合性**: 更新後に`position`値を正規化して、連番の不整合を防ぐ
7. **マイグレーションの安全性**: トランザクション内で実行し、失敗時はロールバック

## リスクと対策

詳細なリスク分析は `THEME_ORDER_RISKS_AND_CONCERNS.md` を参照してください。

主なリスク:
- **高リスク**: データベースマイグレーションの失敗、同時更新による競合状態、position値の重複・不整合
- **中リスク**: パフォーマンスへの影響、既存コードへの影響、UI/UXの問題
- **低リスク**: 後方互換性、エラーハンドリング

対策:
- マイグレーションはトランザクション内で実行
- 楽観的ロックによる同時更新の検出
- 更新後のposition値の正規化
- 適切なエラーハンドリングとロールバック

## テスト項目

1. 既存データのマイグレーションが正常に動作するか
2. ドラッグ&ドロップで順序が変更できるか
3. 順序変更後、ダッシュボードと分析ページで同じ順序が表示されるか
4. エラー時に元の順序に戻るか
5. `position`が`NULL`のテーマが正しく処理されるか
