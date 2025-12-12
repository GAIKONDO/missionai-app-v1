/**
 * firebase/firestore の互換実装
 * Tauri環境では localFirebase から、それ以外では実際のFirebase SDKから再エクスポート
 * 
 * 注意: TypeScriptでは条件付きエクスポートができないため、
 * 常にlocalFirebaseから再エクスポートし、localFirebase.tsで環境を判定する
 */

// 常にlocalFirebaseから再エクスポート
// localFirebase.tsが実行時に環境を判定して適切なAPIを使用
export {
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  deleteField,
  Timestamp,
} from './localFirebase';
