# 未使用TypeScriptファイルの調査結果

## 完全に未使用（削除可能）

### 1. デバッグ用ファイル
- **`lib/debug-company-org-matching.ts`** - Companiesテーブル削除により無効化されている
- **`lib/debug-org-structure.ts`** - windowオブジェクトに追加されているが、実際には使用されていない

### 2. 無効化されたファイル
- **`lib/firebaseSync.ts`** - Tauri環境では無効化されており、すべての関数がエラーをスローする

### 3. スタブファイル（互換性のため残す必要がある可能性）
- **`lib/firebase.ts`** - Firebase互換スタブ（webpackエイリアスで使用される可能性）
- **`lib/firestore.ts`** - Firestore互換スタブ（再エクスポート）
- **`lib/storage.ts`** - Storage互換スタブ
- **`lib/auth.ts`** - Auth再エクスポート（使用されている可能性が高い）
- **`lib/tauri-stub.js`** - Tauriスタブ（使用されている可能性）
- **`lib/vega-canvas-stub.js`** - Vega Canvasスタブ（使用されている可能性）

### 4. 無効化された機能
- **`lib/buildCompanyHierarchy.ts`** - Companiesテーブル削除により無効化されている（型定義として使用されている可能性）

## テスト用ファイル（開発環境でのみ使用）

### 使用されているテストファイル
- **`lib/testUtils.ts`** - `scripts/test-knowledge-graph-rag.ts`で使用
- **`lib/testOrgData.ts`** - `components/TestOrgDataHelper.tsx`で使用
- **`lib/testRAGUtils.ts`** - テスト用ユーティリティ（使用されている可能性）

### 使用状況不明のテストファイル
- **`lib/testChromaUtils.ts`** - テスト用ユーティリティ（使用されているか確認が必要）

## 一時的なスクリプトファイル（一部は使用されている）

### 使用されているファイル
- **`lib/check-bpo-members-db.ts`** - `app/organization/page.tsx`で使用
- **`lib/save-bpo-members-only.ts`** - `app/organization/page.tsx`で使用
- **`lib/save-frontier-business-members.ts`** - `app/organization/page.tsx`で使用
- **`lib/remove-ict-division-duplicates.ts`** - `app/organization/page.tsx`で使用
- **`lib/save-ict-division-members.ts`** - `app/organization/page.tsx`で使用
- **`lib/reorder-frontier-business.ts`** - `app/organization/page.tsx`で使用
- **`lib/check-department-order.ts`** - `app/organization/page.tsx`で使用
- **`lib/save-communications-business-members.ts`** - `lib/recreate-bpo-section.ts`と`lib/save-bpo-members-only.ts`で使用
- **`lib/save-planning-members.ts`** - 使用されている可能性
- **`lib/check-planning-members.ts`** - 使用されている可能性
- **`lib/quick-check-members.ts`** - 使用されている可能性

### 使用状況不明のファイル
- **`lib/save-business-support-members.ts`** - 使用されているか確認が必要
- **`lib/save-it-business-members.ts`** - 使用されているか確認が必要
- **`lib/copy-companies-to-production-safe.ts`** - 使用されているか確認が必要
- **`lib/copy-companies-to-production.ts`** - 使用されているか確認が必要
- **`lib/copy-org-members-from-production.ts`** - 使用されているか確認が必要
- **`lib/remove-duplicate-members.ts`** - 使用されているか確認が必要
- **`lib/fix-frontier-business-department.ts`** - 使用されているか確認が必要
- **`lib/reset-frontier-business-department.ts`** - 使用されているか確認が必要
- **`lib/recreate-bpo-section.ts`** - 使用されているか確認が必要

## その他のファイル

### 使用されているファイル
- **`lib/conceptIdMapping.ts`** - `lib/conceptCopy.ts`で使用されている

### 使用状況不明
- **`lib/openCursor.ts`** - Cursor起動ユーティリティ（使用されているか確認が必要）
- **`lib/cursorResponseWatcher.ts`** - 使用されているか確認が必要

## 推奨アクション

### 即座に削除可能（5ファイル）
1. **`lib/debug-company-org-matching.ts`** - Companiesテーブル削除により無効化されている
2. **`lib/debug-org-structure.ts`** - windowオブジェクトに追加されているが、実際には使用されていない
3. **`lib/firebaseSync.ts`** - Tauri環境では無効化されており、すべての関数がエラーをスローする
4. **`lib/openCursor.ts`** - 使用されていない（Cursor起動ユーティリティ）
5. **`lib/cursorResponseWatcher.ts`** - 使用されていない（Cursor応答監視ユーティリティ）

### 確認後に削除を検討
1. **`lib/buildCompanyHierarchy.ts`** - Companiesテーブル削除により無効化されているが、型定義として使用されている可能性があるため、確認が必要
2. **`lib/testChromaUtils.ts`** - テスト用だが、使用されているか確認が必要
3. 各種save-*, copy-*, remove-*, fix-*, reset-*, recreate-* ファイルの一部（個別に確認が必要）

### 残す必要がある（互換性のため）
1. `lib/firebase.ts` - webpackエイリアスで使用される可能性
2. `lib/firestore.ts` - 再エクスポートとして使用されている
3. `lib/auth.ts` - 再エクスポートとして使用されている
4. `lib/storage.ts` - 互換性のため必要
5. `lib/tauri-stub.js` - スタブとして必要
6. `lib/vega-canvas-stub.js` - スタブとして必要
