ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP NULL;

CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);

CREATE VIEW active_tasks AS
SELECT *
FROM tasks
WHERE deleted_at IS NULL;
