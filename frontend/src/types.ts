export interface Task {
  id: number;
  title: string;
  content: string;
  deadline?: string | null;
  status: TaskStatus;
  deleted_at?: string | null;
}

export interface NewTask {
  title: string;
  content: string;
  deadline?: string | null;
  status: TaskStatus;
}

export type TaskStatus = "TODO" | "INPROGRESS" | "BLOCKED" | "DONE";
