import { useState, useEffect, KeyboardEvent, DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Task, NewTask, TaskStatus } from '../types';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { useErrorHandler } from '../hooks/useErrorHandler';

const STATUSES: TaskStatus[] = ["TODO", "INPROGRESS", "BLOCKED", "DONE"];
const STATUS_NAMES: Record<TaskStatus, string> = {
  "TODO": 'To Do',
  "INPROGRESS": 'In Progress', 
  "BLOCKED": 'Blocked',
  "DONE": 'Done',
};

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitles, setNewTaskTitles] = useState<Record<TaskStatus, string>>({
    "TODO": '', "INPROGRESS": '', "BLOCKED": '', "DONE": '',
  });
  const { throwError } = useErrorHandler();

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch tasks')))
      .then(setTasks)
      .catch(err => throwError(err))
      .finally(() => setLoading(false));
  }, [throwError]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.setData('taskId', task.id.toString());
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    const task = tasks.find(t => t.id === taskId);
    
    if (!task || task.status === newStatus) return;

    try {
      const updateData: NewTask = {
        title: task.title,
        content: task.content,
        deadline: task.deadline,
        status: newStatus
      };

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error(`Failed to update task: ${res.status}`);

      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
    } catch (err) {
      throwError(err instanceof Error ? err : new Error('Failed to update task'));
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      throwError(err instanceof Error ? err : new Error('Failed to delete task'));
    }
  };

  const handleNewTaskKeyPress = async (e: KeyboardEvent<HTMLInputElement>, status: TaskStatus) => {
    if (e.key !== 'Enter' || !newTaskTitles[status].trim()) return;

    const newTask: NewTask = {
      title: newTaskTitles[status].trim(),
      content: '',
      deadline: null,
      status
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });

      if (!res.ok) throw new Error('Failed to create task');
      
      const createdTask: Task = await res.json();
      setTasks([...tasks, createdTask]);
      setNewTaskTitles({ ...newTaskTitles, [status]: '' });
    } catch (err) {
      throwError(err instanceof Error ? err : new Error('Failed to create task'));
    }
  };

  const getDeadlineColor = (deadline: string | null) => {
    if (!deadline) return '';
    const deadlineDate = new Date(deadline);
    if (isPast(deadlineDate)) return 'text-error';
    if (isWithinInterval(deadlineDate, { start: new Date(), end: addDays(new Date(), 7) })) {
      return 'text-warning';
    }
    return '';
  };

  const sortTasks = (tasks: Task[]) => {
    return [...tasks].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  };

  const updateNewTaskTitle = (status: TaskStatus, value: string) => {
    setNewTaskTitles({ ...newTaskTitles, [status]: value });
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  if (loading) return <div className="flex justify-center p-8">Loading...</div>;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-base-200 min-h-screen">
      {STATUSES.map(status => (
        <div
          key={status}
          className="card bg-base-100 shadow-xl"
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, status)}
        >
          <div className="card-body">
            <h2 className="card-title text-primary">
              {STATUS_NAMES[status]}
            </h2>
            
            <input
              type="text"
              placeholder="Add new task (press Enter)"
              className="input input-bordered w-full"
              value={newTaskTitles[status]}
              onChange={(e) => updateNewTaskTitle(status, e.target.value)}
              onKeyPress={(e) => handleNewTaskKeyPress(e, status)}
            />

            <div className="space-y-2 mt-4">
              {sortTasks(tasks)
                .filter(task => task.status === status)
                .map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => handleDragStart(e, task)}
                    className="card bg-base-200 shadow-lg cursor-move hover:shadow-xl transition-shadow"
                  >
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start">
                        <Link
                          to={`/task/${task.id}`}
                          className="card-title text-sm text-base-content hover:text-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          title={task.title}
                        >
                          {truncateText(task.title)}
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                          className="btn btn-ghost btn-sm btn-square hover:btn-error"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {task.deadline && (
                        <p className={`text-sm ${getDeadlineColor(task.deadline)}`}>
                          Due: {format(new Date(task.deadline), 'MMM d, yyyy HH:mm')}
                        </p>
                      )}
                      {task.content && (
                        <p className="text-sm text-base-content/70">{task.content}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
