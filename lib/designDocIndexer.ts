/**
 * システム設計ドキュメントの自動インデックス機能
 * システム設計ページの内容を抽出してChromaDBに保存
 */

import { saveDesignDocEmbeddingToChroma } from './designDocRAG';

/**
 * システム設計セクションの定義
 */
export interface DesignDocSection {
  id: string;
  title: string;
  description: string;
  content: string; // セクションのテキスト内容（Mermaidコードを除去）
  tags: string[];
  order: number;
  pageUrl: string;
  hierarchy?: string[];
  relatedSections?: string[];
}

/**
 * システム設計ドキュメントのセクション定義
 * 各セクションの内容を定義（将来的にはMarkdownファイルから読み込む）
 */
const DESIGN_DOC_SECTIONS: Omit<DesignDocSection, 'content'>[] = [
  {
    id: 'app-architecture',
    title: 'アプリ全体構成',
    description: '使用ライブラリとアーキテクチャ',
    tags: [
      'architecture', 'frontend', 'backend', 'Tauri', 'Next.js', 'React', 'TypeScript',
      'Rust', 'Tokio', 'Axum', 'IPC通信', 'デスクトップアプリ', 'クロスプラットフォーム',
      'AIアシスタント', 'RAG', 'Retrieval-Augmented Generation', 'LLM', 'OpenAI', 'Ollama'
    ],
    order: 1,
    pageUrl: '/design',
    hierarchy: ['アプリ全体構成'],
    relatedSections: ['database-overview', 'page-structure'],
  },
  {
    id: 'database-overview',
    title: 'データベース構成',
    description: 'SQLiteとChromaDBの全体構成',
    tags: [
      'database', 'SQLite', 'ChromaDB', 'データベース設計', 'ベクトルデータベース',
      '構造化データ', '埋め込みベクトル', '類似度検索', 'コレクション', '組織分離',
      'ID連携', 'メタデータ', 'データ整合性'
    ],
    order: 2,
    pageUrl: '/design',
    hierarchy: ['データベース構成'],
    relatedSections: ['sqlite-schema', 'chromadb-schema', 'data-flow'],
  },
  {
    id: 'sqlite-schema',
    title: 'SQLiteスキーマ',
    description: 'SQLiteに保存されるデータ構造とテーブル関係',
    tags: [
      'SQLite', 'スキーマ', 'テーブル', 'データ構造', 'ER図', '外部キー',
      'organizations', 'entities', 'relations', 'topics', 'meetingNotes',
      'focusInitiatives', 'companies', 'organizationMembers', 'ID管理', 'トランザクション'
    ],
    order: 3,
    pageUrl: '/design',
    hierarchy: ['データベース構成', 'SQLiteスキーマ'],
    relatedSections: ['database-overview', 'data-flow'],
  },
  {
    id: 'chromadb-schema',
    title: 'ChromaDBスキーマ',
    description: 'ChromaDBに保存されるベクトルデータ',
    tags: [
      'ChromaDB', 'ベクトル', '埋め込み', 'RAG検索', 'コレクション構造',
      'entities_orgId', 'relations_orgId', 'topics_orgId', 'design_docs',
      'メタデータ', 'ID連携', '類似度検索', 'セマンティック検索'
    ],
    order: 4,
    pageUrl: '/design',
    hierarchy: ['データベース構成', 'ChromaDBスキーマ'],
    relatedSections: ['database-overview', 'data-flow'],
  },
  {
    id: 'data-flow',
    title: 'データフロー',
    description: 'データの保存・取得の流れ',
    tags: [
      'データフロー', 'データ処理', 'API', 'コマンド', 'Tauri Commands',
      '保存フロー', '取得フロー', 'RAG検索フロー', '更新フロー', '削除フロー',
      '非同期処理', '埋め込み生成', 'OpenAI API', 'Ollama', 'AI生成', '手動入力',
      'Upsert', 'カスケード削除', 'トランザクション'
    ],
    order: 5,
    pageUrl: '/design',
    hierarchy: ['データフロー'],
    relatedSections: ['database-overview', 'page-structure'],
  },
  {
    id: 'page-structure',
    title: 'ページ構造',
    description: 'ページ間のリンク関係とID管理',
    tags: [
      'ページ構造', 'ルーティング', 'Next.js', 'ID管理', '動的ルーティング',
      '静的ページ', '動的ページ', 'URLパラメータ', 'クエリパラメータ',
      'サイドバー', 'ナビゲーション', 'router.push', 'usePathname',
      'generateUniqueId', 'organizationId', 'meetingId', 'topicId', 'entityId',
      'relationId', 'companyId', 'initiativeId'
    ],
    order: 6,
    pageUrl: '/design',
    hierarchy: ['ページ構造'],
    relatedSections: ['app-architecture', 'data-flow'],
  },
];

/**
 * セクションIDから内容を取得（DOMから抽出または定義から取得）
 * 現在は簡易的な実装として、説明文とタグからコンテンツを生成
 */
function getSectionContent(sectionId: string): string {
  const section = DESIGN_DOC_SECTIONS.find(s => s.id === sectionId);
  if (!section) {
    return '';
  }

  // セクションごとの詳細な説明を定義
  const contentMap: Record<string, string> = {
    'app-architecture': `
アプリ全体構成について説明します。

MissionAIアプリケーションは、Tauri 2.0を使用したデスクトップアプリケーションです。
フロントエンドはNext.js 14とReact 18で構築され、TypeScriptで型安全に開発されています。
バックエンドはRustで実装され、Tauri Commandsを通じてIPC通信を行います。

主要な技術スタック:
- フロントエンド: Next.js 14, React 18, TypeScript, React Query, D3.js, Three.js, Monaco Editor, react-markdown
- バックエンド: Tauri 2.0, Tokio（非同期ランタイム）, Axum（HTTPサーバー）, rusqlite, chromadb（2.3.0）, reqwest, serde/serde_json, uuid, chrono
- データベース: SQLite（構造化データ）、ChromaDB（ベクトルデータ、Python Server）
- 外部サービス: OpenAI API（埋め込み生成・LLM）、Ollama（ローカルLLM実行環境）

AIアシスタントの動作:
AIアシスタントはRAG（Retrieval-Augmented Generation）を使用して、ナレッジグラフの情報を参照しながら回答を生成します。
1. ユーザークエリ受信
2. RAG検索実行（クエリに関連するエンティティ、リレーション、トピックをChromaDBで検索）
3. 詳細情報取得（検索結果のIDを使用してSQLiteから詳細情報を取得）
4. コンテキスト構築（検索結果をコンテキストとして整形）
5. LLM API呼び出し（OpenAI APIまたはOllamaに、コンテキスト + ユーザークエリを送信）
6. 回答生成（LLMがコンテキストを参照して回答を生成）
7. 回答表示（生成された回答をユーザーに表示）

技術スタックの特徴:
- クロスプラットフォーム: Tauriにより、Mac/Windows/Linuxで動作
- パフォーマンス: Rustバックエンドによる高速処理
- セキュリティ: TauriのセキュリティモデルとRustのメモリ安全性
- スケーラビリティ: ChromaDBによる大規模ベクトル検索対応
- 開発体験: TypeScript + Reactによる型安全なフロントエンド開発
    `.trim(),
    'database-overview': `
データベース構成について説明します。

MissionAIアプリケーションは、2つのデータベースを使用しています。

1. SQLite（構造化データ）
   - エンティティ、リレーション、トピックなどの構造化データを保存
   - rusqliteクレートを使用してRustからアクセス
   - アプリケーションデータディレクトリに保存
   - 役割: メタデータ、リレーション、ID管理など、構造化されたデータを保存
   - 保存される情報: エンティティ情報（名前、タイプ、メタデータ、組織ID）、リレーション情報（エンティティ間の関係、トピックID、リレーションタイプ）、トピック情報（基本情報、メタデータ、キーワード）、組織・メンバー情報（組織階層、メンバー情報、議事録）
   - 特徴: 高速な構造化データの検索・更新に最適、トランザクション管理も可能

2. ChromaDB（ベクトルデータ）
   - 埋め込みベクトルを保存・検索
   - Python Serverとして起動
   - Rustクライアント（chromadb crate）からHTTP経由でアクセス
   - 組織ごとにコレクションを分離（entities_{orgId}, relations_{orgId}, topics_{orgId}）
   - 役割: エンティティ、リレーション、トピックの埋め込みベクトルを保存し、類似度検索を提供
   - コレクション命名規則: entities_{organizationId}（エンティティ埋め込み）、relations_{organizationId}（リレーション埋め込み）、topics_{organizationId}（トピック埋め込み）
   - 特徴: 組織ごとにコレクションを分離し、セマンティック検索とRAG（Retrieval-Augmented Generation）を実現

SQLiteとChromaDBの連携:
- SQLiteとChromaDBは直接接続はしませんが、IDを介して間接的に連携しています
- 保存時: SQLiteにエンティティの基本情報（ID、名前、タイプなど）を保存 → ChromaDBに埋め込みベクトルを保存（SQLiteのIDをメタデータとして含む）
- 検索時: ChromaDBで類似度検索を実行 → 検索結果のIDを使用してSQLiteから詳細情報を取得
- データ整合性: SQLiteがマスターデータ、ChromaDBが検索用インデックスとして機能

データの保存フロー:
- エンティティ/リレーション/トピックを作成・更新時に、自動的に埋め込みベクトルを生成
- 埋め込みベクトルをChromaDBに保存
- メタデータとIDをSQLiteに保存
    `.trim(),
      'sqlite-schema': `
SQLiteスキーマについて説明します。

SQLiteには以下のテーブルが定義されています:

- organizations: 組織情報（id, parentId, name, title, description, level, levelName, position, createdAt, updatedAt）
- organizationMembers: 組織メンバー情報（id, organizationId, name, position, createdAt, updatedAt）
- entities: エンティティ（人、組織、概念など）（id, name, type, aliases, metadata, organizationId, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt）
- relations: エンティティ間の関係（id, topicId, sourceEntityId, targetEntityId, relationType, description, confidence, metadata, organizationId, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt）
- meetingNotes: 議事録（id, organizationId, title, description, content, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt）
- topics: トピックのメタデータ（id, topicId, meetingNoteId, organizationId, title, description, content, semanticCategory, keywords, tags, chromaSynced, chromaSyncError, lastChromaSyncAttempt, createdAt, updatedAt）
- focusInitiatives: 注力施策（id, organizationId, title, description, topicIds, createdAt, updatedAt）
- companies: 事業会社（id, organizationId, name, code, description, metadata, createdAt, updatedAt）

テーブル関係:
- organizations ||--o{ organizationMembers: has
- organizations ||--o{ meetingNotes: has
- organizations ||--o{ entities: belongs_to
- organizations ||--o{ topics: belongs_to
- organizations ||--o{ companies: belongs_to
- meetingNotes ||--o{ topics: contains
- topics ||--o{ relations: has
- topics }o--|| entities: referenced_by_metadata
- entities ||--o{ relations: source
- entities ||--o{ relations: target

ID管理の詳細:
- topics.id: トピックのユニークID（例: init_mj0b1gma_hywcwrspw）
- topics.topicId: トピックのユニークID（topics.idと同じ値）
- relations.topicId: トピックID（topics.topicIdと同じ値）
- entities.metadata.topicId: topics.topicIdと同じ値（topicId部分のみ）

外部キー制約:
- relations.topicId → topics.topicId（参照）
- relations.sourceEntityId → entities.id
- relations.targetEntityId → entities.id
- topics.meetingNoteId → meetingNotes.id
- topics.organizationId → organizations.id
- entities.organizationId → organizations.id

注意事項:
- topicRelationsテーブルはrelationsテーブルにリネームされました
- topicEmbeddingsテーブルはtopicsテーブルに統合されました
- 埋め込みベクトルはChromaDBにのみ保存されます（SQLiteにはメタデータのみ）

各テーブルはID、作成日時、更新日時などの共通フィールドを持ちます。
エンティティとリレーションは組織IDで紐づけられ、組織ごとにデータを分離しています。
    `.trim(),
    'chromadb-schema': `
ChromaDBスキーマについて説明します。

ChromaDBには以下のコレクションが作成されます:

- entities_{organizationId}: エンティティの埋め込みベクトル
- relations_{organizationId}: リレーションの埋め込みベクトル
- topics_{organizationId}: トピックの埋め込みベクトル
- design_docs: システム設計ドキュメントの埋め込みベクトル（組織を跨いで共有）

entities_{organizationId}コレクション構造:
- id: エンティティID（SQLiteのentities.idと同じ）
- embedding: 埋め込みベクトル（エンティティ名 + エイリアス + メタデータ）
- metadata: メタデータ（entityId, organizationId, name, type, aliases, metadata, nameEmbedding, metadataEmbedding, embeddingModel, embeddingVersion, createdAt, updatedAt）

relations_{organizationId}コレクション構造:
- id: リレーションID（SQLiteのrelations.idと同じ）
- embedding: 埋め込みベクトル（リレーションタイプ + 説明 + メタデータ）
- metadata: メタデータ（relationId, organizationId, topicId, sourceEntityId, targetEntityId, relationType, description, confidence, metadata, embeddingModel, embeddingVersion, createdAt, updatedAt）

topics_{organizationId}コレクション構造:
- id: トピックID（SQLiteのtopics.topicIdと同じ）
- embedding: 埋め込みベクトル（タイトル + コンテンツ + メタデータ）
- metadata: メタデータ（topicId, meetingNoteId, organizationId, title, content, semanticCategory, keywords, tags, embeddingModel, embeddingVersion, createdAt, updatedAt）

ID連携:
- ChromaDBのidフィールドはSQLiteのIDと同じ値を使用します
- これにより、ChromaDBで検索した結果のIDを使ってSQLiteから詳細情報を取得できます
- metadataにはSQLite参照用のIDも含まれます

検索時は、クエリの埋め込みベクトルと類似度を計算して、関連するエンティティ/リレーション/トピックを取得します。
組織ごとにコレクションを分離することで、データの分離とセキュリティを実現しています。
    `.trim(),
    'data-flow': `
データフローについて説明します。

データの保存フロー（パターン1: AI生成によるメタデータ抽出）:
1. ユーザーがトピック作成・編集
2. フロントエンドからAIにトピック内容からエンティティ・リレーション抽出を依頼
3. AIが抽出結果（エンティティ、リレーション）を返す
4. ユーザーがAI生成結果を確認・編集
5. フロントエンドからバックエンドにエンティティ・リレーション保存を依頼
6. バックエンドがSQLiteに構造化データ保存（id, name, type, metadata）
7. フロントエンドからバックエンドに埋め込み生成を依頼（非同期）
8. バックエンドが埋め込みAPIに埋め込みベクトル生成を依頼（エンティティ名+メタデータ）
9. 埋め込みAPIが埋め込みベクトルを返す
10. バックエンドがChromaDBにベクトル保存（id, embedding, metadata含むSQLiteのID）

データの保存フロー（パターン2: 手動入力によるメタデータ作成）:
1. ユーザーがエンティティ手動作成
2. フロントエンドからバックエンドにcreateEntity APIを呼び出し
3. バックエンドがSQLiteにエンティティ情報保存
4. バックエンドが作成されたエンティティを返す
5. フロントエンドからバックエンドに埋め込み生成を依頼（非同期）
6. バックエンドが埋め込みAPIに埋め込みベクトル生成を依頼
7. 埋め込みAPIが埋め込みベクトルを返す
8. バックエンドがChromaDBにベクトル保存

保存フローの特徴:
- 二段階保存: まずSQLiteに構造化データを保存し、その後非同期でChromaDBに埋め込みベクトルを保存
- IDの一貫性: ChromaDBのidフィールドはSQLiteのIDと同じ値を使用し、メタデータにも含める
- 非同期処理: 埋め込み生成は非同期で実行され、ユーザー操作をブロックしない
- エラーハンドリング: 埋め込み生成が失敗しても、SQLiteのデータは保存済み（後で再生成可能）

RAG検索フロー:
1. ユーザーが検索クエリ入力（例: "トヨタのプロジェクト"）
2. フロントエンドからバックエンドにRAG検索リクエスト
3. バックエンドが埋め込みAPIにクエリの埋め込みベクトル生成を依頼
4. 埋め込みAPIがクエリ埋め込みベクトルを返す
5. バックエンドがChromaDBで並列検索を実行（エンティティ類似度検索、リレーション類似度検索、トピック類似度検索）
6. ChromaDBが類似エンティティID + 類似度、類似リレーションID + 類似度、類似トピックID + 類似度を返す
7. バックエンドがSQLiteからIDで詳細情報取得（エンティティ、リレーション、トピック）
8. SQLiteが詳細データを返す
9. バックエンドが結果統合・スコアリング（ベクトル類似度 + メタデータブースト）
10. バックエンドが検索結果（エンティティ、リレーション、トピック）を返す
11. フロントエンドが検索結果を表示
12. （オプション）AIアシスタント使用時: フロントエンドが検索結果をコンテキストに追加し、AIがコンテキストに基づく回答を生成

RAG検索の特徴:
- 並列検索: エンティティ、リレーション、トピックを並列に検索してパフォーマンスを最適化
- ハイブリッド検索: ChromaDBのベクトル類似度とSQLiteのメタデータを組み合わせてスコアリング
- コンテキスト構築: 検索結果をLLMのコンテキストとして使用し、より正確な回答を生成
- 段階的取得: まずChromaDBで高速に類似度検索し、その後SQLiteで詳細情報を取得

データ更新フロー:
1. ユーザーがエンティティ・リレーション・トピック編集
2. フロントエンドからバックエンドに更新リクエスト
3. バックエンドがSQLiteに構造化データ更新（name, type, metadata等）
4. SQLiteが更新完了を返す
5. バックエンドが更新完了通知を返す
6. フロントエンドからバックエンドに埋め込み再生成を依頼（非同期）
7. バックエンドが埋め込みAPIに更新された内容で埋め込みベクトル再生成を依頼
8. 埋め込みAPIが新しい埋め込みベクトルを返す
9. バックエンドがChromaDBにベクトル更新（upsert、同じIDで上書き）
10. ChromaDBが更新完了を返す

更新フローの特徴:
- 即座の更新: SQLiteの構造化データは即座に更新され、ユーザーはすぐに変更を確認できる
- 非同期再生成: 埋め込みベクトルは非同期で再生成され、検索精度を維持
- Upsert操作: ChromaDBではupsertを使用し、同じIDで既存データを上書き
- IDの保持: 更新時もIDは変更されず、SQLiteとChromaDBの連携が維持される

AIアシスタントのフロー:
1. ユーザーの質問を受信
2. RAG検索で関連情報を取得（エンティティ、リレーション、トピック、システム設計ドキュメント）
3. コンテキストとして整形
4. LLM API（OpenAI/Ollama）に送信
5. 生成された回答を表示
    `.trim(),
    'page-structure': `
ページ構造について説明します。

MissionAIアプリケーションのページ構造は以下の通りです:

静的ページ（サイドバーから直接アクセス）:
- /: ダッシュボード（app/page.tsx、現在はシンプルな表示のみ）
- /analytics: 分析（app/analytics/page.tsx）
- /knowledge-graph: ナレッジグラフ（app/knowledge-graph/page.tsx）
- /rag-search: RAG検索（app/rag-search/page.tsx）
- /reports: レポート（app/reports/page.tsx）
- /design: システム設計（app/design/page.tsx）
- /settings: 設定（app/settings/page.tsx）

動的ページ（クエリパラメータでID管理）:
- /organization: 組織一覧（app/organization/page.tsx）
- /organization/detail?id=xxx: 組織詳細（app/organization/detail/page.tsx、タブ: ?tab=introduction|focusAreas|focusInitiatives|meetingNotes）
- /organization/detail/meeting?meetingId=xxx&id=xxx: 議事録詳細（app/organization/detail/meeting/page.tsx、個別トピック作成可能）
- /organization/initiative?organizationId=xxx&initiativeId=xxx: 注力施策詳細（app/organization/initiative/page.tsx、トピック紐づけ可能）
- /companies: 事業会社一覧（app/companies/page.tsx）
- /companies/detail?id=xxx: 事業会社詳細（app/companies/detail/page.tsx）

クエリパラメータでIDを渡すページ:
- /knowledge-graph?entityId=xxx: エンティティハイライト
- /knowledge-graph?relationId=xxx: リレーションハイライト

サイドバーとナビゲーション:
- サイドバーはLayoutコンポーネント経由で全ページに表示
- SidebarコンポーネントがmenuItems配列を参照（components/Sidebar.tsx）
- アイコンクリックまたはメニューアイテムクリックでrouter.push(path)が実行される
- 現在のページはusePathname()で取得し、getCurrentPage()でページIDを判定

ID管理:
- すべてのエンティティ、リレーション、トピックはユニークIDで管理
- IDはgenerateUniqueId()で生成（例: init_mj0b1gma_hywcwrspw）
- クエリパラメータ（?id=xxx）でIDを渡す
- 組織ID（organizationId）: SQLiteのorganizations.idを使用（形式: init_miwceusf_lmthnq2ks）
- 議事録ID（meetingId）: SQLiteのmeetingNotes.idを使用
- トピックID（topicId）: SQLiteのtopics.topicIdを使用（形式: init_mj0b1gma_hywcwrspw）
- エンティティID（entityId）: SQLiteのentities.idを使用（形式: entity_{timestamp}_{random}）
- リレーションID（relationId）: SQLiteのrelations.idを使用
- 事業会社ID（companyId）: SQLiteのcompanies.idを使用
- 注力施策ID（initiativeId）: SQLiteのfocusInitiatives.idを使用

個別トピックのID管理:
- トピックID生成: generateUniqueId()でユニークIDを生成（例: init_mj0b1gma_hywcwrspw）
- SQLite保存: topicsテーブルにメタデータを保存（埋め込みベクトルはChromaDBにのみ保存）
- ChromaDB保存: topics_{organizationId}コレクションにid: topicId（SQLiteのtopicIdと同じ）で保存
- 注力施策への紐づけ: focusInitiatives.topicIds[]配列にtopicIdを追加（複数のトピックを紐づけ可能）
- データ整合性: すべての場所で同じtopicIdを使用することで、一貫性を保証

データの読み込みフロー:
1. ページマウント時: useEffectでIDを取得（useSearchParams()でクエリパラメータから取得）
2. ID検証: IDが存在するか確認
3. データ取得: IDを使用してSQLiteからデータを取得（getEntityById、getMeetingNoteByIdなど）
4. 状態更新: 取得したデータをReactの状態に設定
5. レンダリング: データを基にUIをレンダリング

ページ構造のまとめ:
- 静的ページ: サイドバーにハードコーディングされたパスで直接アクセス
- 動的ページ: クエリパラメータ（?id=xxx）でIDを管理し、SQLiteからデータを読み込み
- クエリパラメータ: ページ内でのフィルタリングやハイライト、IDの受け渡しに使用
- データソース: すべてのデータはSQLiteから取得され、IDで一意に識別
- リンク関係: router.push()を使用してプログラムから遷移、またはLinkコンポーネントでリンク
- ID取得方法: useSearchParams()フックでクエリパラメータからIDを取得
- この設計により、URLから直接ページにアクセスでき、ブラウザの戻る/進むボタンも正常に動作します
    `.trim(),
  };

  return contentMap[sectionId] || section.description;
}

/**
 * システム設計ドキュメントを自動インデックス
 * すべてのセクションをChromaDBに保存
 */
export async function indexDesignDocs(): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('システム設計ドキュメントのインデックスはクライアント側でのみ実行可能です');
    return;
  }

  console.log('🔍 システム設計ドキュメントのインデックスを開始します...');

  try {
    let successCount = 0;
    let errorCount = 0;

    for (const section of DESIGN_DOC_SECTIONS) {
      try {
        const content = getSectionContent(section.id);
        
        if (!content) {
          console.warn(`⚠️  セクション ${section.id} の内容が空です。スキップします。`);
          continue;
        }

        await saveDesignDocEmbeddingToChroma(
          section.id,
          section.title,
          content,
          {
            tags: section.tags,
            order: section.order,
            pageUrl: section.pageUrl,
            hierarchy: section.hierarchy,
            relatedSections: section.relatedSections,
          }
        );

        successCount++;
        console.log(`✅ セクション「${section.title}」をインデックスしました`);
      } catch (error) {
        errorCount++;
        console.error(`❌ セクション「${section.title}」のインデックスに失敗:`, error);
      }
    }

    console.log(`✅ システム設計ドキュメントのインデックスが完了しました（成功: ${successCount}件、失敗: ${errorCount}件）`);
  } catch (error) {
    console.error('❌ システム設計ドキュメントのインデックスエラー:', error);
    throw error;
  }
}

/**
 * 特定のセクションのみをインデックス
 */
export async function indexDesignDocSection(sectionId: string): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('システム設計ドキュメントのインデックスはクライアント側でのみ実行可能です');
    return;
  }

  const section = DESIGN_DOC_SECTIONS.find(s => s.id === sectionId);
  if (!section) {
    throw new Error(`セクション ${sectionId} が見つかりません`);
  }

  try {
    const content = getSectionContent(section.id);
    
    if (!content) {
      throw new Error(`セクション ${section.id} の内容が空です`);
    }

    await saveDesignDocEmbeddingToChroma(
      section.id,
      section.title,
      content,
      {
        tags: section.tags,
        order: section.order,
        pageUrl: section.pageUrl,
        hierarchy: section.hierarchy,
        relatedSections: section.relatedSections,
      }
    );

    console.log(`✅ セクション「${section.title}」をインデックスしました`);
  } catch (error) {
    console.error(`❌ セクション「${section.title}」のインデックスに失敗:`, error);
    throw error;
  }
}

/**
 * システム設計ドキュメントの再インデックス
 * 既存のインデックスを更新
 */
export async function reindexDesignDocs(): Promise<void> {
  console.log('🔄 システム設計ドキュメントの再インデックスを開始します...');
  await indexDesignDocs();
}
