use crate::database::{get_db, set_current_user, get_timestamp, User};
use rusqlite::Result as SqlResult;
use bcrypt::{hash, verify, DEFAULT_COST};
use uuid::Uuid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SignUpResult {
    pub user: User,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SignInResult {
    pub user: User,
}

pub fn sign_up(email: String, password: String) -> SqlResult<SignUpResult> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;
    let conn = db.get_connection()?;
    
    let user_id = Uuid::new_v4().to_string();
    let password_hash = hash(password, DEFAULT_COST).unwrap_or_default();
    let now = get_timestamp();
    
    // ローカル特化型では自動承認
    let approved = 1;
    
    conn.execute(
        "INSERT INTO users (id, email, passwordHash, approved, createdAt, updatedAt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        [&user_id, &email, &password_hash, &approved.to_string(), &now, &now],
    )?;
    
    // 承認リクエストを作成
    let status = if approved == 1 { "approved" } else { "pending" };
    let request_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO approvalRequests (id, userId, email, status, requestedAt)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        [&request_id, &user_id, &email, status, &now],
    )?;
    
    let user = User {
        uid: user_id,
        email,
        email_verified: false,
    };
    
    Ok(SignUpResult { user })
}

pub fn sign_in(email: String, password: String) -> SqlResult<SignInResult> {
    let db = get_db().ok_or_else(|| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
        Some("データベースが初期化されていません".to_string())
    ))?;
    let conn = db.get_connection()?;
    
    let mut stmt = conn.prepare("SELECT * FROM users WHERE email = ?1")?;
    let user_row = stmt.query_row([&email], |row| {
        Ok((
            row.get::<_, String>(0)?, // id
            row.get::<_, String>(1)?, // email
            row.get::<_, String>(2)?, // passwordHash
            row.get::<_, i32>(3)?,    // approved
        ))
    });
    
    let (user_id, user_email, password_hash, approved) = match user_row {
        Ok(row) => row,
        Err(_) => return Err(rusqlite::Error::QueryReturnedNoRows),
    };
    
    // パスワードチェック
    let is_valid = verify(password, &password_hash).unwrap_or(false);
    if !is_valid {
        return Err(rusqlite::Error::InvalidQuery);
    }
    
    // 承認チェック
    if approved == 0 {
        return Err(rusqlite::Error::InvalidQuery);
    }
    
    let user = User {
        uid: user_id,
        email: user_email,
        email_verified: true,
    };
    
    set_current_user(Some(user.clone()));
    
    Ok(SignInResult { user })
}

pub fn sign_out() {
    set_current_user(None);
}

