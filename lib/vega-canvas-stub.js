// vega-canvasのスタブ（ブラウザでは不要）
// ブラウザ環境ではcanvasは不要なので、空の実装を提供

// vega-canvasがエクスポートする可能性のある関数やクラスをスタブとして提供
module.exports = {
  // 空の実装を提供
  node: function() { return null; },
  image: function() { return null; },
  canvas: function() { return null; },
  // その他の可能性のあるエクスポート
  default: {}
};
