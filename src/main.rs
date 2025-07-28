mod db;
mod schema;
mod task;

use anyhow::Result as AnyhowResult;
use axum::{
    extract::{Path, State},
    http::{header, StatusCode},
    response::Response,
    routing::{delete, get, post, put},
    Json, Router,
};
use clap::Parser;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel::r2d2::{self, ConnectionManager};
use include_dir::{include_dir, Dir};
use mime_guess;
use std::{env, net::SocketAddr, sync::Arc};
use tracing::{debug, info, Level};

type DbPool = r2d2::Pool<ConnectionManager<PgConnection>>;

static FRONTEND: Dir = include_dir!("$CARGO_MANIFEST_DIR/frontend/dist");

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[arg(short, long, default_value_t = 3000)]
    port: u16,
}

fn initialize_database() -> AnyhowResult<Arc<DbPool>> {
    let database_url =
        env::var("DATABASE_URL").map_err(|e| anyhow::anyhow!("DATABASE_URL must be set: {}", e))?;

    debug!("Connecting to database...");
    let mut conn = PgConnection::establish(&database_url)
        .map_err(|e| anyhow::anyhow!("Failed to establish database connection: {}", e))?;

    debug!("Running migrations...");
    db::run_migrations(&mut conn)
        .map_err(|e| anyhow::anyhow!("Failed to run migrations: {}", e))?;

    debug!("Setting up connection pool...");
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    let pool = r2d2::Pool::builder()
        .max_size(5)
        .min_idle(Some(1))
        .connection_timeout(std::time::Duration::from_secs(60))
        .idle_timeout(Some(std::time::Duration::from_secs(300)))
        .max_lifetime(Some(std::time::Duration::from_secs(1800)))
        .test_on_check_out(true)
        .build(manager)
        .map_err(|e| anyhow::anyhow!("Failed to create connection pool: {}", e))?;
    let pool = Arc::new(pool);

    debug!("Database initialized successfully!");
    Ok(pool)
}

async fn get_tasks(
    State(pool): State<Arc<DbPool>>,
) -> Result<Json<Vec<task::Task>>, (axum::http::StatusCode, String)> {
    let mut conn = pool.get().map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to get DB connection: {}", e),
        )
    })?;

    match db::get_all_tasks(&mut conn) {
        Ok(tasks) => Ok(Json(tasks)),
        Err(e) => Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to get tasks: {}", e),
        )),
    }
}

async fn create_task(
    State(pool): State<Arc<DbPool>>,
    Json(new_task): Json<task::NewTask>,
) -> Result<Json<task::Task>, (axum::http::StatusCode, String)> {
    let mut conn = pool.get().map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to get DB connection: {}", e),
        )
    })?;

    match db::create_task(&mut conn, new_task) {
        Ok(task) => Ok(Json(task)),
        Err(e) => Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to create task: {}", e),
        )),
    }
}

async fn get_task(
    State(pool): State<Arc<DbPool>>,
    Path(task_id): Path<i32>,
) -> Result<Json<task::Task>, (axum::http::StatusCode, String)> {
    let mut conn = pool.get().map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to get DB connection: {}", e),
        )
    })?;

    match db::get_task(&mut conn, task_id) {
        Ok(task) => Ok(Json(task)),
        Err(e) => {
            if let diesel::result::Error::NotFound = e {
                Err((
                    axum::http::StatusCode::NOT_FOUND,
                    format!("Task with id {} not found", task_id),
                ))
            } else {
                Err((
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to get task: {}", e),
                ))
            }
        }
    }
}

async fn update_task(
    State(pool): State<Arc<DbPool>>,
    Path(task_id): Path<i32>,
    Json(updated_task): Json<task::NewTask>,
) -> Result<Json<task::Task>, (axum::http::StatusCode, String)> {
    let mut conn = pool.get().map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to get DB connection: {}", e),
        )
    })?;

    match db::update_task(&mut conn, task_id, updated_task) {
        Ok(task) => Ok(Json(task)),
        Err(e) => Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to update task: {}", e),
        )),
    }
}

async fn delete_task(
    State(pool): State<Arc<DbPool>>,
    Path(task_id): Path<i32>,
) -> Result<(), (axum::http::StatusCode, String)> {
    let mut conn = pool.get().map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to get DB connection: {}", e),
        )
    })?;

    match db::delete_task(&mut conn, task_id) {
        Ok(count) if count > 0 => Ok(()),
        Ok(_) => Err((
            axum::http::StatusCode::NOT_FOUND,
            format!("Task with id {} not found", task_id),
        )),
        Err(e) => Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to delete task: {}", e),
        )),
    }
}

async fn serve_frontend() -> Result<Response, StatusCode> {
    match FRONTEND.get_file("index.html") {
        Some(file) => Ok(Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "text/html")
            .body(file.contents().into())
            .unwrap()),
        None => Err(StatusCode::NOT_FOUND),
    }
}

async fn serve_assets(Path(file_path): Path<String>) -> Result<Response, StatusCode> {
    let full_path = format!("assets/{}", file_path);
    let mime_type = mime_guess::from_path(&full_path)
        .first_or_octet_stream()
        .to_string();

    match FRONTEND.get_file(&full_path) {
        Some(file) => Ok(Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime_type)
            .header("Cache-Control", "public, max-age=31536000")
            .body(file.contents().into())
            .unwrap()),
        None => Err(StatusCode::NOT_FOUND),
    }
}

#[tokio::main]
async fn main() -> AnyhowResult<()> {
    tracing_subscriber::fmt()
        .with_max_level(Level::DEBUG)
        .init();

    let args = Args::parse();

    let pool = initialize_database()?;

    let api_routes = Router::new()
        .route("/tasks", get(get_tasks))
        .route("/tasks", post(create_task))
        .route("/tasks/:task_id", get(get_task))
        .route("/tasks/:task_id", put(update_task))
        .route("/tasks/:task_id", delete(delete_task));

    let app = Router::new()
        .nest("/api", api_routes)
        .route("/", get(serve_frontend))
        .route("/assets/*file", get(serve_assets))
        .with_state(pool);

    let host: std::net::IpAddr = "0.0.0.0".parse()?;
    let addr = SocketAddr::new(host, args.port);
    debug!("Server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app.into_make_service())
        .with_graceful_shutdown(async {
            tokio::signal::ctrl_c()
                .await
                .expect("failed to install Ctrl+C handler");
            info!("signal received, starting graceful shutdown");
        })
        .await?;

    Ok(())
}
