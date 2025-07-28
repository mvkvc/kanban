use chrono::Local;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use std::error::Error;

use crate::task::{NewTask, Task};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

pub fn run_migrations(
    conn: &mut PgConnection,
) -> Result<(), Box<dyn Error + Send + Sync + 'static>> {
    conn.run_pending_migrations(MIGRATIONS)?;
    Ok(())
}

pub fn create_task(conn: &mut PgConnection, new_task: NewTask) -> QueryResult<Task> {
    use crate::schema::tasks::dsl::*;

    diesel::insert_into(tasks).values(new_task).execute(conn)?;

    tasks.order(id.desc()).first(conn)
}

pub fn get_all_tasks(conn: &mut PgConnection) -> QueryResult<Vec<Task>> {
    use crate::schema::tasks::dsl::*;

    tasks.filter(deleted_at.is_null()).load::<Task>(conn)
}

pub fn get_task(conn: &mut PgConnection, task_id: i32) -> QueryResult<Task> {
    use crate::schema::tasks::dsl::*;

    tasks
        .filter(id.eq(task_id))
        .filter(deleted_at.is_null())
        .first(conn)
}

pub fn update_task(
    conn: &mut PgConnection,
    task_id: i32,
    updated_task: NewTask,
) -> QueryResult<Task> {
    use crate::schema::tasks::dsl::*;

    diesel::update(tasks.filter(id.eq(task_id)).filter(deleted_at.is_null()))
        .set((
            title.eq(updated_task.title),
            content.eq(updated_task.content),
            deadline.eq(updated_task.deadline),
            status.eq(updated_task.status.to_string()),
        ))
        .execute(conn)?;

    tasks
        .filter(id.eq(task_id))
        .filter(deleted_at.is_null())
        .first(conn)
}

pub fn delete_task(conn: &mut PgConnection, task_id: i32) -> QueryResult<usize> {
    use crate::schema::tasks::dsl::*;

    diesel::update(tasks.find(task_id))
        .set(deleted_at.eq(Local::now().naive_local()))
        .execute(conn)
}
