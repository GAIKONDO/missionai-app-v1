use axum::{
    Router,
    routing::{get, post, put, delete},
};

use crate::api::handlers;

pub fn create_routes() -> Router {
    Router::new()
        // ヘルスチェック
        .route("/health", get(handlers::health_check))
        
        // 組織関連API
        .route("/api/organizations", get(handlers::get_organizations))
        .route("/api/organizations", post(handlers::create_organization))
        .route("/api/organizations/:id", get(handlers::get_organization))
        .route("/api/organizations/:id", put(handlers::update_organization))
        .route("/api/organizations/:id", delete(handlers::delete_organization))
        .route("/api/organizations/:id/members", get(handlers::get_organization_members))
        .route("/api/organizations/:id/members", post(handlers::add_organization_member))
        .route("/api/organizations/:id/members/:member_id", put(handlers::update_organization_member))
        .route("/api/organizations/:id/members/:member_id", delete(handlers::delete_organization_member))
        .route("/api/organizations/tree", get(handlers::get_organization_tree))
        .route("/api/organizations/search", get(handlers::search_organizations))
        
        // 事業会社関連API
        .route("/api/companies", get(handlers::get_companies))
        .route("/api/companies", post(handlers::create_company))
        .route("/api/companies/:id", get(handlers::get_company))
        .route("/api/companies/:id", put(handlers::update_company))
        .route("/api/companies/:id", delete(handlers::delete_company))
        .route("/api/companies/code/:code", get(handlers::get_company_by_code))
        .route("/api/companies/organization/:org_id", get(handlers::get_companies_by_organization))
        
        // 組織と事業会社の表示関係API
        .route("/api/organization-company-displays", get(handlers::get_all_organization_company_displays))
        .route("/api/organization-company-displays", post(handlers::create_organization_company_display))
        .route("/api/organization-company-displays/organization/:org_id", get(handlers::get_companies_by_organization_display))
        .route("/api/organization-company-displays/company/:company_id", get(handlers::get_organizations_by_company_display))
        .route("/api/organization-company-displays/:id/order", put(handlers::update_organization_company_display_order))
        .route("/api/organization-company-displays/:id", delete(handlers::delete_organization_company_display))
        .route("/api/organization-company-displays/organization/:org_id/company/:company_id", delete(handlers::delete_organization_company_display_by_ids))
        
        // リレーション関連API
        .route("/api/relations", get(handlers::get_relations))
        .route("/api/relations", post(handlers::create_relation))
        .route("/api/relations/:id", get(handlers::get_relation))
        .route("/api/relations/:id", put(handlers::update_relation))
        .route("/api/relations/:id", delete(handlers::delete_relation))
        
        // エンティティ関連API
        .route("/api/entities", get(handlers::get_entities))
        .route("/api/entities", post(handlers::create_entity))
        .route("/api/entities/:id", get(handlers::get_entity))
        .route("/api/entities/:id", put(handlers::update_entity))
        .route("/api/entities/:id", delete(handlers::delete_entity))
        
        // テーマ関連API
        .route("/api/themes", get(handlers::get_themes))
        .route("/api/themes", post(handlers::create_theme))
        .route("/api/themes/:id", get(handlers::get_theme))
        .route("/api/themes/:id", put(handlers::update_theme))
        .route("/api/themes/:id", delete(handlers::delete_theme_handler))
}
