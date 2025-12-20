# 残りのコンポーネント使用状況確認結果

## ✅ すべて使用されています

以下の33個のコンポーネントはすべて実際に使用されているため、**保持**します：

### 使用されているコンポーネント一覧

1. **AIAssistantPanel** - Layout.tsxで使用
2. **CompanyChart** - lib/buildCompanyHierarchy.tsで型定義として使用（CompanyNodeData）
3. **CauseEffectDiagramUpdateModal** - app/organization/initiative/page.tsxで使用
4. **ConceptForm** - lib/conceptCopy.tsで型定義として使用（ConceptData）
5. **ConceptSubMenu** - 複数箇所でSUB_MENU_ITEMSとして使用
6. **ContainerEditModal** - AIAssistantPanel.tsxで使用
7. **EmbeddingRegenerationContext** - 複数箇所で使用（useEmbeddingRegeneration、EmbeddingRegenerationProvider）
8. **ErrorBoundary** - app/layout.tsxとLayout.tsxで使用
9. **Header** - Layout.tsxで使用
10. **Icons** - Sidebar.tsxとapp/rag-search/page.tsxで使用（各種アイコン）
11. **InitiativeCauseEffectDiagram** - app/organization/initiative/page.tsxとCauseEffectDiagramUpdateModal.tsxで使用
12. **InitiativeList** - app/a2c100/page.tsxで使用
13. **KeyVisualPDFMetadataEditor** - components/pages/component-test/test-concept/Page0.tsxで使用
14. **KnowledgeGraph2D** - app/rag-search/page.tsxとcomponents/RelationshipDiagram2D.tsxで使用
15. **KnowledgeGraph3D** - app/knowledge-graph/page.tsxとcomponents/RelationshipDiagram2D.tsxで使用
16. **Layout** - 複数のページで使用（全ページの基本レイアウト）
17. **Login** - Layout.tsxで使用
18. **MermaidLoader** - app/organization/initiative/page.tsxで使用
19. **MonetizationDiagramUpdateModal** - app/organization/initiative/page.tsxで使用
20. **OrgBubbleChart** - app/organization/views/BubbleView.tsxで使用
21. **OrgChart** - 複数箇所で使用（コンポーネントと型定義：OrgNodeData、MemberInfo）
22. **PresentationModeContext** - 複数箇所で使用（usePresentationMode）
23. **QueryProvider** - app/layout.tsxで使用
24. **RelationDiagramUpdateModal** - app/organization/initiative/page.tsxで使用
25. **RelationshipBubbleChart** - app/analytics/page.tsxで使用（動的インポート）
26. **RelationshipDiagram2D** - app/analytics/page.tsxで使用（動的インポート）
27. **Sidebar** - Layout.tsxで使用
28. **TabBar** - Layout.tsxで使用
29. **TabProvider** - Layout.tsxとUrlBar.tsxで使用（useTabs）
30. **TauriTestHelper** - app/layout.tsxで使用
31. **TestOrgDataHelper** - app/layout.tsxで使用
32. **VegaChart** - app/page.tsxで使用（動的インポート）
33. **ThemeHierarchyChart** - app/a2c100/page.tsxで使用
34. **ThemeHierarchyEditor** - app/a2c100/page.tsxで使用
35. **UrlBar** - Layout.tsxで使用

## 結論

**すべてのコンポーネントが使用されているため、削除する必要はありません。**

### 使用パターン

1. **直接使用**: コンポーネントとしてJSXで使用
2. **型定義として使用**: CompanyChart（CompanyNodeData）、ConceptForm（ConceptData）、OrgChart（OrgNodeData、MemberInfo）
3. **定数として使用**: ConceptSubMenu（SUB_MENU_ITEMS）
4. **Context/Providerとして使用**: EmbeddingRegenerationContext、PresentationModeContext、TabProvider、QueryProvider
5. **動的インポート**: RelationshipBubbleChart、RelationshipDiagram2D、VegaChart

すべてのコンポーネントが何らかの形で使用されているため、現時点で削除すべきコンポーネントはありません。
