/**
 * @tauri-apps/api/core のスタブ
 * ビルド時にエラーが出ないようにするための空の実装
 * 実行時には動的インポートで実際のモジュールが読み込まれる
 */

// 空のオブジェクトをエクスポート（実行時に動的インポートで置き換えられる）
module.exports = {
  invoke: () => {
    throw new Error('@tauri-apps/api/core is not available. This stub should be replaced at runtime.');
  },
};

