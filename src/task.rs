use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

use crate::schema::tasks;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub enum TaskStatus {
    #[serde(rename = "TODO")]
    Todo,
    #[serde(rename = "INPROGRESS")]
    InProgress,
    #[serde(rename = "BLOCKED")]
    Blocked,
    #[serde(rename = "DONE")]
    Done,
}

impl fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let status_str = match self {
            TaskStatus::Todo => "TODO",
            TaskStatus::InProgress => "INPROGRESS",
            TaskStatus::Blocked => "BLOCKED",
            TaskStatus::Done => "DONE",
        };
        write!(f, "{}", status_str)
    }
}

impl FromStr for TaskStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "TODO" => Ok(TaskStatus::Todo),
            "INPROGRESS" => Ok(TaskStatus::InProgress),
            "BLOCKED" => Ok(TaskStatus::Blocked),
            "DONE" => Ok(TaskStatus::Done),
            _ => Err(format!("Invalid status: {}", s)),
        }
    }
}

impl Default for TaskStatus {
    fn default() -> Self {
        TaskStatus::Todo
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Queryable)]
#[diesel(table_name = tasks)]
pub struct Task {
    pub id: i32,
    pub title: String,
    pub content: String,
    pub deadline: Option<NaiveDateTime>,
    #[diesel(deserialize_as = String)]
    pub status: TaskStatus,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(Deserialize, Insertable)]
#[diesel(table_name = tasks)]
pub struct NewTask {
    pub title: String,
    pub content: String,
    pub deadline: Option<NaiveDateTime>,
    #[diesel(serialize_as = String)]
    pub status: TaskStatus,
}

impl From<String> for TaskStatus {
    fn from(s: String) -> Self {
        TaskStatus::from_str(&s).unwrap_or_default()
    }
}

impl From<TaskStatus> for String {
    fn from(status: TaskStatus) -> Self {
        status.to_string()
    }
}
