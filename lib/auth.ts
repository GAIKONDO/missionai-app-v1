/**
 * firebase/auth の再エクスポート
 * localFirebaseから再エクスポートします（Tauri環境ではローカル認証を使用）
 */

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
