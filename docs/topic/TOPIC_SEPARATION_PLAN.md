# トピック分離計画書

> **📋 ステータス**: 設計案（一部実装済み）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: トピック分離の設計計画書

## 概要

`meetingNotes.content`のJSON内にハードコードされているトピックを、独立した`topics`テーブルに分離し、JSONにはトピックIDの参照のみを保存するように変更します。

**注意**: `topics`テーブルは既に実装済みです（`topicEmbeddings`から統合済み）。このドキュメントは設計計画書として残していますが、一部の機能は実装済みです。

## 目標

1. **データベース設計の改善**: トピックの基本情報を独立したテーブルで管理
2. **データ整合性の向上**: トピックの削除・更新が確実に反映される
3. **パフォーマンスの向上**: JSONパースの負荷を軽減
4. **実装の簡素化**: 既存データを削除して新構造で一から始める

## 前提条件

**重要**: 既存のアーカイブ（議事録）はすべて削除して問題ないため、データ移行は行わず、新しい構造で一から実装します。

**実装状況**: `topics`テーブルは既に実装済みです。ただし、JSON内のトピックデータとの完全な分離は未実装の可能性があります。

---

## フェーズ1: データベーススキーマ設計

### 1.1 新しい`topics`テーブルの作成

```sql
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,                    -- トピックのユニークID（例: init_mj0azdvj_jf4c6fojt）
    meetingNoteId TEXT NOT NULL,           -- 親議事録ID
    itemId TEXT NOT NULL,                  -- 親アイテムID（JSON内のitem.id）
    organizationId TEXT NOT NULL,           -- 組織ID
    title TEXT NOT NULL,                   -- トピックタイトル
    content TEXT NOT NULL,                 -- トピックコンテンツ
    mentionedDate TEXT,                    -- 言及された日付（ISO 8601形式）
    isAllPeriods INTEGER DEFAULT 0,        -- 全期間に反映するか（0=false, 1=true）
    tabId TEXT NOT NULL,                   -- タブID（april, may, q1-summaryなど）
    position INTEGER DEFAULT 0,            -- アイテム内での順序
    createdAt TEXT NOT NULL,               -- 作成日時（ISO 8601形式）
    updatedAt TEXT NOT NULL,               -- 更新日時（ISO 8601形式）
    FOREIGN KEY (meetingNoteId) REFERENCES meetingNotes(id),
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_topics_meetingNoteId ON topics(meetingNoteId);
CREATE INDEX IF NOT EXISTS idx_topics_itemId ON topics(itemId);
CREATE INDEX IF NOT EXISTS idx_topics_organizationId ON topics(organizationId);
CREATE INDEX IF NOT EXISTS idx_topics_tabId ON topics(tabId);
```

### 1.2 `topics`テーブルの実装状況 ✅ **実装済み**

**実装状況**: `topics`テーブルは既に実装済みです（`topicEmbeddings`から統合済み）。

**現在の構造**:
- `id`: トピックID
- `topicId`: トピックID（`id`と同じ値）
- `meetingNoteId`: 議事録ID
- `organizationId`: 組織ID
- `title`: タイトル
- `description`: 説明
- `content`: コンテンツ
- `semanticCategory`: セマンティックカテゴリ
- `keywords`: キーワード（JSON文字列）
- `tags`: タグ（JSON文字列）
- `chromaSynced`: ChromaDB同期状態
- `chromaSyncError`: 同期エラーメッセージ
- `lastChromaSyncAttempt`: 最後の同期試行日時
- `createdAt`: 作成日時
- `updatedAt`: 更新日時

**推奨**: `topics`テーブルとJOINして取得（正規化の原則に従う）✅ **実装済み**

---

## フェーズ2: 既存データの削除（オプション）

### 2.1 既存アーカイブの削除

既存のアーカイブ（議事録）を削除する場合は、以下のコマンドを実行：

```typescript
/**
 * 既存のアーカイブをすべて削除（オプション）
 * 注意: この操作は不可逆です。実行前にバックアップを取ることを推奨します。
 */
async function deleteAllMeetingNotes() {
  const { callTauriCommand } = await import('./localFirebase');
  const { getMeetingNotes } = await import('./lib/orgApi');
  
  // すべての組織の議事録を取得
  const allOrganizations = await getAllOrganizations();
  
  for (const org of allOrganizations) {
    const meetingNotes = await getMeetingNotes(org.id);
    
    for (const note of meetingNotes) {
      // 議事録を削除
      await callTauriCommand('doc_delete', {
        collectionName: 'meetingNotes',
        docId: note.id,
      });
      
      // 関連するトピックも削除（既に存在する場合）
      // 注意: topicsテーブルは実装済み
      try {
        await callTauriCommand('query_delete', {
          collectionName: 'topics',
          conditions: [{ field: 'meetingNoteId', operator: '==', value: note.id }],
        });
      } catch (error) {
        // エラーは無視（既に削除されている可能性がある）
      }
    }
  }
  
  console.log('✅ 既存のアーカイブをすべて削除しました');
}
```

**注意**: 
- この操作は不可逆です
- 実行前にデータベースのバックアップを取ることを推奨します
- 関連するエンティティやリレーションも削除するか検討が必要です

### 2.2 新しいJSON構造

**新構造**（トピックID参照のみ）:
```json
{
  "april": {
    "summary": "4月のサマリー",
    "summaryId": "summaryId",
    "items": [
      {
        "id": "itemId",
        "title": "アイテムタイトル",
        "content": "アイテムコンテンツ",
        "date": "2025-04-01",
        "topics": [
          {
            "id": "topicId"  // ← ID参照のみ（詳細はtopicsテーブルから取得）
          }
        ]
      }
    ]
  }
}
```

---

## フェーズ3: コード変更

### 3.1 Rust側の変更

#### 3.1.1 `topics`テーブルの作成

**ファイル**: `src-tauri/src/database/mod.rs`

```rust
// topicsテーブルの作成を追加
conn.execute(
    "CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        meetingNoteId TEXT NOT NULL,
        itemId TEXT NOT NULL,
        organizationId TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        mentionedDate TEXT,
        isAllPeriods INTEGER DEFAULT 0,
        tabId TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (meetingNoteId) REFERENCES meetingNotes(id),
        FOREIGN KEY (organizationId) REFERENCES organizations(id)
    )",
    [],
)?;

// インデックスの作成
conn.execute(
    "CREATE INDEX IF NOT EXISTS idx_topics_meetingNoteId ON topics(meetingNoteId)",
    [],
)?;
conn.execute(
    "CREATE INDEX IF NOT EXISTS idx_topics_itemId ON topics(itemId)",
    [],
)?;
conn.execute(
    "CREATE INDEX IF NOT EXISTS idx_topics_organizationId ON topics(organizationId)",
    [],
)?;
conn.execute(
    "CREATE INDEX IF NOT EXISTS idx_topics_tabId ON topics(tabId)",
    [],
)?;
```

#### 3.1.2 Tauriコマンドの追加

**ファイル**: `src-tauri/src/commands/db.rs`

```rust
/// トピックを取得（ID指定）
#[tauri::command]
pub async fn get_topic(topic_id: String) -> Result<HashMap<String, Value>, String> {
    // topicsテーブルから取得
}

/// トピックを保存
#[tauri::command]
pub async fn save_topic(data: HashMap<String, Value>) -> Result<HashMap<String, Value>, String> {
    // topicsテーブルに保存
}

/// トピックを削除
#[tauri::command]
pub async fn delete_topic(topic_id: String) -> Result<(), String> {
    // topicsテーブルから削除
}

/// 議事録に紐づくトピックを取得
#[tauri::command]
pub async fn get_topics_by_meeting_note(meeting_note_id: String) -> Result<Vec<HashMap<String, Value>>, String> {
    // meetingNoteIdでtopicsテーブルから取得
}

/// アイテムに紐づくトピックを取得
#[tauri::command]
pub async fn get_topics_by_item(item_id: String) -> Result<Vec<HashMap<String, Value>>, String> {
    // itemIdでtopicsテーブルから取得
}
```

### 3.2 TypeScript側の変更

#### 3.2.1 トピックAPIの作成

**ファイル**: `lib/topicApi.ts`（新規作成）

```typescript
export interface Topic {
  id: string;
  meetingNoteId: string;
  itemId: string;
  organizationId: string;
  title: string;
  content: string;
  mentionedDate?: string | null;
  isAllPeriods?: boolean;
  tabId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * トピックを取得（ID指定）
 */
export async function getTopicById(topicId: string): Promise<Topic | null> {
  const { callTauriCommand } = await import('./localFirebase');
  const result = await callTauriCommand('get_topic', { topicId });
  return result?.data || null;
}

/**
 * トピックを保存
 */
export async function saveTopic(topic: Partial<Topic>): Promise<string> {
  const { callTauriCommand } = await import('./localFirebase');
  const result = await callTauriCommand('save_topic', { data: topic });
  return result?.id || topic.id || '';
}

/**
 * トピックを削除
 */
export async function deleteTopic(topicId: string): Promise<void> {
  const { callTauriCommand } = await import('./localFirebase');
  await callTauriCommand('delete_topic', { topicId });
}

/**
 * 議事録に紐づくトピックを取得
 */
export async function getTopicsByMeetingNote(meetingNoteId: string): Promise<Topic[]> {
  const { callTauriCommand } = await import('./localFirebase');
  const result = await callTauriCommand('get_topics_by_meeting_note', { meetingNoteId });
  return result || [];
}

/**
 * アイテムに紐づくトピックを取得
 */
export async function getTopicsByItem(itemId: string): Promise<Topic[]> {
  const { callTauriCommand } = await import('./localFirebase');
  const result = await callTauriCommand('get_topics_by_item', { itemId });
  return result || [];
}
```

#### 3.2.2 `orgApi.ts`の変更

**ファイル**: `lib/orgApi.ts`

```typescript
/**
 * 指定された議事録の個別トピックを取得（新方式）
 */
export async function getTopicsByMeetingNote(meetingNoteId: string): Promise<TopicInfo[]> {
  // 1. topicsテーブルから取得
  const topics = await getTopicsByMeetingNoteFromDB(meetingNoteId);
  
  // 2. TopicInfo形式に変換
  const meetingNote = await getMeetingNoteById(meetingNoteId);
  if (!meetingNote) return [];
  
  return topics.map(topic => ({
    id: topic.id,
    title: topic.title,
    content: topic.content,
    meetingNoteId: topic.meetingNoteId,
    meetingNoteTitle: meetingNote.title,
    itemId: topic.itemId,
    organizationId: topic.organizationId,
    topicDate: topic.mentionedDate || undefined,
    isAllPeriods: topic.isAllPeriods || false,
  }));
}
```

#### 3.2.3 `page.tsx`の変更

**ファイル**: `app/organization/[id]/meeting/[meetingId]/page.tsx`

##### 3.2.3.1 データ読み込み処理の変更

```typescript
// データ読み込み
useEffect(() => {
  const loadData = async () => {
    // 1. 議事録データを取得
    const noteData = await getMeetingNoteById(meetingId);
    setMeetingNote(noteData);
    
    // 2. JSONをパース（トピックID参照のみ）
    if (noteData?.content) {
      const parsed = JSON.parse(noteData.content) as MeetingNoteData;
      
      // 3. 各タブの各アイテムのトピックIDを取得
      const initialized: MeetingNoteData = {};
      
      for (const [tabId, tabData] of Object.entries(parsed)) {
        const itemsWithTopics = await Promise.all(
          (tabData.items || []).map(async (item) => {
            // 4. アイテムに紐づくトピックをデータベースから取得
            const topics = await getTopicsByItem(item.id);
            
            // 5. トピックをJSON形式に変換（表示用）
            return {
              ...item,
              topics: topics.map(topic => ({
                id: topic.id,
                title: topic.title,
                content: topic.content,
                mentionedDate: topic.mentionedDate,
                isAllPeriods: topic.isAllPeriods,
              })),
            };
          })
        );
        
        initialized[tabId] = {
          ...tabData,
          items: itemsWithTopics,
        };
      }
      
      setMonthContents(initialized);
    }
  };
  
  loadData();
}, [meetingId]);
```

##### 3.2.3.2 トピック保存処理の変更

```typescript
// トピック保存時
const handleSaveTopic = async () => {
  // 1. topicsテーブルに保存
  const topicId = await saveTopic({
    id: editingTopicId || generateUniqueId(),
    meetingNoteId: meetingNote.id,
    itemId: editingTopicItemId!,
    organizationId: meetingNote.organizationId,
    title: topicTitle,
    content: topicContent,
    mentionedDate: topicDate || null,
    isAllPeriods: topicIsAllPeriods || false,
    tabId: activeTab,
    position: getNextTopicPosition(activeTab, editingTopicItemId!),
  });
  
  // 2. JSONにはID参照のみを保存
  setMonthContents(prev => {
    const updated = { ...prev };
    const tabData = updated[activeTab] as MonthContent | undefined;
    if (tabData) {
      const itemIndex = tabData.items.findIndex(i => i.id === editingTopicItemId);
      if (itemIndex !== -1) {
        const updatedItems = [...tabData.items];
        const currentTopics = updatedItems[itemIndex].topics || [];
        
        if (editingTopicId) {
          // 更新: 既存のトピックIDを保持
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            topics: currentTopics.map(t => 
              t.id === editingTopicId ? { id: editingTopicId } : t
            ),
          };
        } else {
          // 新規: トピックIDを追加
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            topics: [...currentTopics, { id: topicId }],
          };
        }
        
        updated[activeTab] = {
          ...tabData,
          items: updatedItems,
        };
      }
    }
    return updated;
  });
  
  // 3. meetingNotes.contentを保存（ID参照のみ）
  await saveMeetingNote({
    ...meetingNote,
    content: JSON.stringify(monthContents, null, 2),
  });
};
```

##### 3.2.3.3 トピック削除処理の変更

```typescript
// トピック削除時
const confirmDeleteTopic = async () => {
  // 1. topicsテーブルから削除
  await deleteTopic(topicId);
  
  // 2. JSONからトピックID参照を削除
  setMonthContents(prev => {
    const updated = { ...prev };
    // ... トピックID参照を削除する処理
    return updated;
  });
  
  // 3. meetingNotes.contentを保存
  await saveMeetingNote({
    ...meetingNote,
    content: JSON.stringify(monthContents, null, 2),
  });
};
```

---

## フェーズ4: 後方互換性の確保

### 4.1 フォールバック処理

既存のJSON形式（トピック詳細が含まれている）も読み込めるようにする。

```typescript
async function loadTopicsWithFallback(
  meetingNoteId: string,
  itemId: string,
  jsonTopics: Array<{ id: string; title?: string; content?: string }>
): Promise<Topic[]> {
  // 1. データベースから取得を試行
  try {
    const topics = await getTopicsByItem(itemId);
    if (topics.length > 0) {
      return topics;
    }
  } catch (error) {
    console.warn('データベースからの取得に失敗:', error);
  }
  
  // 2. フォールバック: JSONから読み込む（後方互換性）
  if (jsonTopics.some(t => t.title && t.content)) {
    // JSONに詳細が含まれている場合は、データベースに移行
    const topics: Topic[] = [];
    for (const jsonTopic of jsonTopics) {
      if (jsonTopic.title && jsonTopic.content) {
        // データベースに保存
        const topic = await saveTopic({
          id: jsonTopic.id,
          meetingNoteId,
          itemId,
          // ... その他の情報
        });
        topics.push(topic);
      }
    }
    return topics;
  }
  
  // 3. ID参照のみの場合は、データベースから取得
  return await Promise.all(
    jsonTopics.map(t => getTopicById(t.id))
  ).then(topics => topics.filter(t => t !== null) as Topic[]);
}
```

---

## 実装順序

1. ✅ **フェーズ1**: データベーススキーマの作成（**実装済み**）
   - `topics`テーブルは既に実装済み

2. **フェーズ2（オプション）**: 既存アーカイブの削除（必要に応じて）
   - 新構造で一から始める場合は実行

3. **フェーズ3.1**: Rust側の実装（Tauriコマンド）
   - 一部実装済み（`topics`テーブルの操作）
   - 完全な分離のための追加実装が必要な可能性あり

4. **フェーズ3.2**: TypeScript側の実装（API、読み込み・保存・削除処理）
   - 一部実装済み
   - JSON内のトピックデータとの完全な分離が必要な可能性あり

5. **フェーズ4**: テストと動作確認
   - 継続的に実施

**注意**: フェーズ2は既存データを保持する場合はスキップできますが、新構造で一から始める場合は実行することを推奨します。

---

## 注意事項

1. **既存データの削除**: 既存アーカイブを削除する場合は、実行前にバックアップを取る
2. **パフォーマンス**: トピックの読み込みが増えるため、バッチ読み込みを検討
3. **トランザクション**: トピックの保存とJSONの更新をトランザクションで管理
4. **エラーハンドリング**: データベースアクセスエラー時の適切なエラーハンドリング
5. **関連データの削除**: 議事録を削除する場合、関連するエンティティ・リレーション・埋め込みも削除するか検討が必要
6. **実装状況**: `topics`テーブルは既に実装済みですが、JSON内のトピックデータとの完全な分離は未実装の可能性があります

## 関連ドキュメント

- [トピックでAI生成したデータの保存先](./TOPIC_DATA_SAVE_FLOW.md) - トピックデータの保存フロー
- [データベース設計](../database/database-design.md) - SQLiteデータベースの設計
- [埋め込みベクトルの保存場所](../database/EMBEDDING_STORAGE_LOCATIONS.md) - 埋め込みベクトルの保存場所の詳細

---

## テスト項目

1. トピックの作成・更新・削除が正しく動作するか
2. JSONからトピックID参照のみが保存されるか
3. データベースからトピックが正しく読み込まれるか
4. トピック削除時にデータベースからも削除されるか
5. 議事録削除時に関連するトピックも削除されるか
6. パフォーマンステスト（大量のトピックがある場合の読み込み速度）
