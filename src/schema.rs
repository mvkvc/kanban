// @generated automatically by Diesel CLI.

diesel::table! {
    tasks (id) {
        id -> Int4,
        title -> Varchar,
        content -> Varchar,
        deadline -> Nullable<Timestamp>,
        status -> Varchar,
        deleted_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    users (id) {
        id -> Int4,
        #[max_length = 50]
        name -> Varchar,
        age -> Int4,
    }
}

diesel::allow_tables_to_appear_in_same_query!(tasks, users,);
