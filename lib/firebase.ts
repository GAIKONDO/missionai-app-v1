/**
 * Tauri専用のFirebase互換API
 * app33はTauri専用なので、すべてのFirebase関連の呼び出しはlocalFirebaseにリダイレクトされます
 * webpackエイリアスでfirebase/authとfirebase/firestoreがlocalFirebaseにリダイレクトされるため、
 * 実際にはlocalFirebaseから取得されます
 */

// app33はTauri専用なので、常にnullを返す（互換性のため）
export const auth: any = null;
export const db: any = null;
export const storage: any = null;

// Auth関連の関数はlocalFirebaseから再エクスポート
// webpackエイリアスでfirebase/authもlocalFirebaseにリダイレクトされるため、
// 実際にはlocalFirebaseから再エクスポートされる
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from './localFirebase';

export type { User } from './localFirebase';
