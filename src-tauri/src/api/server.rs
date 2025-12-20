use axum::Router;
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any};
use tower::ServiceBuilder;

use crate::database::get_db;

pub async fn start_api_server(addr: SocketAddr) -> Result<(), Box<dyn std::error::Error>> {
    eprintln!("🚀 APIサーバーを起動中: http://{}", addr);
    
    // データベース接続の確認
    if get_db().is_none() {
        eprintln!("❌ データベースが初期化されていません");
        return Err("Database not initialized".into());
    }
    
    // CORS設定（プリフライトリクエストを適切に処理）
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_credentials(false)
        .max_age(std::time::Duration::from_secs(3600));
    
    // ルーターの作成
    let app: Router = crate::api::routes::create_routes()
        .layer(ServiceBuilder::new().layer(cors));
    
    // サーバーの起動
    let listener = tokio::net::TcpListener::bind(addr).await?;
    eprintln!("✅ APIサーバーが起動しました: http://{}", addr);
    
    axum::serve(listener, app).await?;
    
    Ok(())
}
