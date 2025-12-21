# タスクチェーンUI実装計画書

> **📋 ステータス**: 計画中  
> **📅 作成日**: 2025-01-27  
> **👤 用途**: タスクチェーン機能のUI設計と実装計画

## 📋 概要

タスクチェーンのUIを実装し、ユーザーが視覚的にチェーンを作成・編集・実行できるようにします。

## 🎯 目標

1. **視覚的なチェーン作成**: ドラッグ&ドロップでノードを配置し、接続できる
2. **条件分岐の可視化**: 条件分岐を明確に表示
3. **ループ処理の可視化**: ループ構造を視覚的に表現
4. **チェーン実行の監視**: 実行中のチェーンをリアルタイムで監視
5. **実行結果の可視化**: 実行パスと結果を視覚的に表示

---

## 🏗️ UI設計

### 全体構成

```
┌─────────────────────────────────────────────────────────────┐
│  タスクチェーンページ                                        │
├─────────────────────────────────────────────────────────────┤
│  [チェーン一覧] [チェーン作成] [チェーン編集] [実行履歴]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  チェーンエディタ（フローチャート形式）              │    │
│  │                                                      │    │
│  │  [開始] → [タスク1] → [条件分岐] → [タスク2]       │    │
│  │                      ↓        ↓                      │    │
│  │                  [真]      [偽]                     │    │
│  │                      ↓        ↓                      │    │
│  │                  [タスク3] [タスク4]                │    │
│  │                      ↓        ↓                      │    │
│  │                      [終了]                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [実行] [保存] [削除] [エクスポート]                        │
└─────────────────────────────────────────────────────────────┘
```

### タブ構成

1. **チェーン一覧タブ**
   - 登録されているチェーンの一覧表示
   - チェーンの作成・削除
   - チェーンの実行

2. **チェーンエディタタブ**
   - フローチャート形式のエディタ
   - ノードの追加・編集・削除
   - ノード間の接続
   - 条件分岐の設定
   - ループの設定

3. **実行履歴タブ**
   - チェーン実行履歴の一覧
   - 実行結果の詳細表示
   - 実行パスの可視化

---

## 🎨 UIコンポーネント設計

### 1. チェーン一覧コンポーネント

**機能**:
- チェーン一覧の表示（カード形式）
- チェーンの作成ボタン
- チェーンの削除ボタン
- チェーンの実行ボタン
- チェーンの編集ボタン

**表示項目**:
- チェーン名
- 説明
- ノード数
- 最終実行日時
- 実行回数
- 成功率

### 2. チェーンエディタコンポーネント

**機能**:
- フローチャート形式のエディタ
- ノードのドラッグ&ドロップ
- ノード間の接続（エッジ）
- ノードの編集（モーダル）
- ズーム・パン機能

**ノードタイプ**:
- **開始ノード**: チェーンの開始点
- **タスクノード**: 実行するタスク
- **条件ノード**: 条件分岐
- **ループノード**: ループ処理
- **終了ノード**: チェーンの終了点

**ノードの表示**:
- ノードタイプに応じたアイコン
- ノード名
- ノードの状態（実行中、完了、失敗）

### 3. ノード編集モーダル

**タスクノードの場合**:
- タスク選択（既存タスクまたは新規作成）
- タスクパラメータの編集
- 実行条件の設定

**条件ノードの場合**:
- 条件タイプの選択（equals, not_equals, greater_than等）
- フィールドパスの指定
- 比較値の設定
- 真/偽の分岐先ノードの選択

**ループノードの場合**:
- ループ回数の設定
- またはループ継続条件の設定
- ループ内タスクの選択

### 4. 実行監視コンポーネント

**機能**:
- 実行中のチェーンの可視化
- 現在実行中のノードのハイライト
- 実行ログの表示
- 実行パスの表示

**表示項目**:
- 実行ID
- 開始時刻
- 現在のノード
- 実行済みノード
- エラーノード
- 実行ログ

### 5. 実行結果表示コンポーネント

**機能**:
- 実行結果の詳細表示
- 実行パスの可視化
- 各ノードの実行結果
- エラー情報の表示

---

## 🛠️ 技術スタック

### フローチャート描画ライブラリ

**候補1: React Flow**
- プロ: ドラッグ&ドロップ対応、カスタマイズ性が高い
- コン: 学習コストがやや高い

**候補2: D3.js（既存で使用中）**
- プロ: 既存の知識を活用できる、柔軟性が高い
- コン: 実装が複雑

**候補3: Mermaid（既存で使用中）**
- プロ: 既存の知識を活用できる、シンプル
- コン: インタラクティブな編集には不向き

**推奨: React Flow**
- インタラクティブな編集が必要
- ドラッグ&ドロップでノードを配置
- ノード間の接続を視覚的に操作可能

### 必要なパッケージ

```json
{
  "reactflow": "^11.0.0",
  "@reactflow/core": "^11.0.0",
  "@reactflow/controls": "^11.0.0",
  "@reactflow/background": "^11.0.0"
}
```

---

## 📊 データ構造

### チェーンエディタの状態管理

```typescript
interface ChainEditorState {
  nodes: ChainNode[];              // ノード一覧
  edges: ChainEdge[];              // エッジ一覧
  selectedNodeId: string | null;   // 選択中のノードID
  isExecuting: boolean;            // 実行中か
  executionId: string | null;       // 実行ID
}
```

### React Flow用のノードデータ

```typescript
interface FlowNode {
  id: string;
  type: 'start' | 'task' | 'condition' | 'loop' | 'end';
  position: { x: number; y: number };
  data: {
    label: string;
    nodeData: ChainNode;
    status?: 'pending' | 'running' | 'completed' | 'failed';
  };
}
```

### React Flow用のエッジデータ

```typescript
interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'smoothstep' | 'straight';
  animated?: boolean;  // 実行中のエッジをアニメーション
}
```

---

## 🚀 実装フェーズ

### フェーズ1: 基本UI構築（1週間）

#### 1.1 React Flowのセットアップ
- [ ] React Flowパッケージのインストール
- [ ] 基本的なフローチャートエディタの実装
- [ ] ノードの追加・削除機能
- [ ] エッジの追加・削除機能

#### 1.2 チェーン一覧UI
- [ ] チェーン一覧コンポーネントの実装
- [ ] チェーンの作成・削除機能
- [ ] チェーンの実行機能（簡易版）

**成果物**:
- `components/agent-system/ChainList.tsx`
- `components/agent-system/ChainEditor.tsx`（基本版）

---

### フェーズ2: ノード編集機能（1週間）

#### 2.1 ノード編集モーダル
- [ ] タスクノード編集モーダル
- [ ] 条件ノード編集モーダル
- [ ] ループノード編集モーダル
- [ ] ノードの保存・更新機能

#### 2.2 チェーン保存機能
- [ ] チェーンの保存（SQLite）
- [ ] チェーンの読み込み
- [ ] チェーンの更新

**成果物**:
- `components/agent-system/NodeEditModal.tsx`
- `components/agent-system/TaskNodeEditor.tsx`
- `components/agent-system/ConditionNodeEditor.tsx`
- `components/agent-system/LoopNodeEditor.tsx`
- `lib/agent-system/chainManager.ts`（チェーンの保存・読み込み）

---

### フェーズ3: 実行監視機能（1週間）

#### 3.1 実行中の可視化
- [ ] 実行中のノードのハイライト
- [ ] 実行パスの表示
- [ ] 実行ログの表示

#### 3.2 実行結果の表示
- [ ] 実行結果の詳細表示
- [ ] 各ノードの実行結果
- [ ] エラー情報の表示

**成果物**:
- `components/agent-system/ChainExecutionMonitor.tsx`
- `components/agent-system/ExecutionResultView.tsx`

---

### フェーズ4: 高度な機能（1週間）

#### 4.1 ズーム・パン機能
- [ ] ズームイン/アウト
- [ ] パン（移動）
- [ ] ミニマップ

#### 4.2 チェーンのエクスポート/インポート
- [ ] JSON形式でのエクスポート
- [ ] JSON形式でのインポート
- [ ] チェーンの複製

#### 4.3 チェーンテンプレート
- [ ] よく使うチェーンのテンプレート化
- [ ] テンプレートからのチェーン作成

**成果物**:
- `components/agent-system/ChainEditorControls.tsx`（ズーム・パン）
- `components/agent-system/ChainExportImport.tsx`
- `lib/agent-system/chainTemplates.ts`

---

## 🎨 UIデザイン詳細

### ノードのデザイン

#### 開始ノード
- 形状: 角丸矩形
- 色: 緑系（#4caf50）
- アイコン: ▶（再生アイコン）

#### タスクノード
- 形状: 矩形
- 色: 青系（#2196f3）
- アイコン: 📋（タスクアイコン）
- 状態表示:
  - 待機中: グレー
  - 実行中: オレンジ（アニメーション）
  - 完了: 緑
  - 失敗: 赤

#### 条件ノード
- 形状: ひし形
- 色: 黄系（#ffc107）
- アイコン: ❓（疑問符）
- 分岐表示: 真（緑）/ 偽（赤）のラベル

#### ループノード
- 形状: 角丸矩形（二重線）
- 色: 紫系（#9c27b0）
- アイコン: 🔄（ループアイコン）

#### 終了ノード
- 形状: 角丸矩形
- 色: 赤系（#f44336）
- アイコン: ⏹（停止アイコン）

### エッジのデザイン

- 通常: グレーの直線
- 実行中: アニメーション付きの青い線
- 実行済み: 緑の線
- エラー: 赤の線

### レイアウト

- **左サイドバー**: ノードパレット（ドラッグ&ドロップで追加）
- **中央**: フローチャートエディタ
- **右サイドバー**: ノード編集パネル（ノード選択時）
- **下部**: 実行ログ・実行結果

---

## 📝 実装詳細

### チェーンエディタの基本構造

```typescript
// ChainEditor.tsx
export function ChainEditor({ chainId }: { chainId?: string }) {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  // ノード追加
  const onAddNode = (type: NodeType, position: { x: number; y: number }) => {
    // ノードを追加
  };
  
  // ノード削除
  const onDeleteNode = (nodeId: string) => {
    // ノードを削除
  };
  
  // エッジ追加
  const onConnect = (params: Connection) => {
    // エッジを追加
  };
  
  // チェーン保存
  const onSave = async () => {
    // チェーンを保存
  };
  
  // チェーン実行
  const onExecute = async () => {
    // チェーンを実行
  };
  
  return (
    <div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
      >
        <Controls />
        <Background />
        <MiniMap />
      </ReactFlow>
      
      {selectedNode && (
        <NodeEditModal
          nodeId={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSave={onSaveNode}
        />
      )}
    </div>
  );
}
```

### ノードパレット

```typescript
// NodePalette.tsx
export function NodePalette() {
  const nodeTypes = [
    { type: 'start', label: '開始', icon: '▶' },
    { type: 'task', label: 'タスク', icon: '📋' },
    { type: 'condition', label: '条件', icon: '❓' },
    { type: 'loop', label: 'ループ', icon: '🔄' },
    { type: 'end', label: '終了', icon: '⏹' },
  ];
  
  return (
    <div>
      {nodeTypes.map(nodeType => (
        <div
          key={nodeType.type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('nodeType', nodeType.type);
          }}
        >
          {nodeType.icon} {nodeType.label}
        </div>
      ))}
    </div>
  );
}
```

---

## 🔄 データフロー

### チェーンの保存フロー

```
ユーザー操作
  ↓
チェーンエディタ（React Flow）
  ↓
ChainNode[] + ChainEdge[] に変換
  ↓
TaskChain オブジェクトに変換
  ↓
TaskChainManager.registerChain()
  ↓
SQLiteに保存（将来実装）
```

### チェーンの実行フロー

```
ユーザーが「実行」ボタンをクリック
  ↓
チェーンエディタからTaskChainを取得
  ↓
TaskChainManager.executeChain()
  ↓
実行中の状態をチェーンエディタに反映
  ↓
各ノードの実行結果を表示
```

---

## 🧪 テスト計画

### 単体テスト
- [ ] ノード追加・削除のテスト
- [ ] エッジ追加・削除のテスト
- [ ] チェーン保存・読み込みのテスト

### 統合テスト
- [ ] チェーン作成から実行までのフロー
- [ ] 条件分岐の動作確認
- [ ] ループ処理の動作確認

### E2Eテスト
- [ ] UIからのチェーン作成
- [ ] チェーンの実行
- [ ] 実行結果の表示

---

## 📈 成功指標

### 機能面
- ✅ ドラッグ&ドロップでノードを追加できる
- ✅ ノード間を接続できる
- ✅ 条件分岐を設定できる
- ✅ ループ処理を設定できる
- ✅ チェーンを実行できる
- ✅ 実行結果を視覚的に確認できる

### ユーザビリティ面
- ✅ 直感的な操作ができる
- ✅ 実行中の状態が分かりやすい
- ✅ エラー情報が適切に表示される

---

## 🔄 今後の拡張案

### 短期（3-6ヶ月）
- チェーンのバージョン管理
- チェーンの共有機能
- チェーンのスケジュール実行

### 中期（6-12ヶ月）
- チェーンの自動最適化
- チェーンのパフォーマンス分析
- チェーンのデバッグ機能

### 長期（12ヶ月以上）
- AIによるチェーン自動生成
- チェーンの学習機能
- 分散チェーン実行

---

## 📚 参考資料

### 関連ドキュメント
- [Agentシステム実装計画書](./AGENT_SYSTEM_IMPLEMENTATION_PLAN.md)
- [タスクチェーン実装](./../lib/agent-system/taskChain.ts)

### 外部リソース
- React Flow ドキュメント
- フローチャート設計のベストプラクティス
- ワークフローエディタのUI/UXパターン

---

## 📝 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|---------|--------|
| 2025-01-27 | 初版作成 | - |

