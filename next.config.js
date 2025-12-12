/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // クエリパラメータ方式のルーティングを使用するため、動的ルーティングは無効化
  // すべてのページは静的エクスポート可能
  webpack: (config, { isServer, webpack }) => {
    // canvasモジュールを外部化（クライアントサイドビルドでエラーを回避）
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
      path: false,
      crypto: false,
    };
    
    // vega-canvasのnode.jsビルドを無視する設定
    if (!isServer) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^canvas$/,
          contextRegExp: /node_modules\/vega-canvas/,
        })
      );
      
      // vega-canvas.node.jsを無視する設定
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /vega-canvas\\.node\\.js$/,
        })
      );
    }
    
    return config;
  },
}

module.exports = nextConfig

