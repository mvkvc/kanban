import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NewTask, TaskStatus } from '../types';
import { useErrorHandler } from '../hooks/useErrorHandler';

const STATUSES: TaskStatus[] = ["TODO", "INPROGRESS", "BLOCKED", "DONE"];

export default function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<NewTask>({
    title: '',
    content: '',
    deadline: null,
    status: "TODO"
  });
  const [datetimeValue, setDatetimeValue] = useState('');
  const [loading, setLoading] = useState(true);
  const { throwError } = useErrorHandler();

  useEffect(() => {
    if (!id) {
      throwError(new Error('Invalid task ID'));
      return;
    }
    
    fetch(`/api/tasks/${id}`)
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch task')))
      .then(data => {
        setTask({
          title: data.title,
          content: data.content,
          deadline: data.deadline,
          status: data.status
        });
        if (data.deadline) {
          const dt = new Date(data.deadline);
          setDatetimeValue(dt.toISOString().slice(0, 16));
        }
      })
      .catch(err => throwError(err))
      .finally(() => setLoading(false));
  }, [id, throwError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      
      if (!res.ok) throw new Error('Failed to update task');
      navigate('/');
    } catch (err) {
      throwError(err instanceof Error ? err : new Error('Failed to update task'));
    }
  };

  const updateTask = (field: keyof NewTask, value: any) => {
    setTask(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = async () => {
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete task');
      navigate('/');
    } catch (err) {
      throwError(err instanceof Error ? err : new Error('Failed to delete task'));
    }
  };

  if (loading) return <div className="flex justify-center p-8">Loading...</div>;

  return (
    <div className="p-4">
        <div className="mx-auto max-w-3xl">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-6">
              <h2 className="text-2xl font-bold mb-6 text-center">Edit Task</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Title</span>
                  </label>
                  <input
                    type="text" 
                    className="input input-bordered w-full"
                    value={task.title}
                    onChange={(e) => updateTask('title', e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Content</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered min-h-[200px] w-full"
                    value={task.content}
                    onChange={(e) => updateTask('content', e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Deadline</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered w-full"
                    value={datetimeValue}
                    onChange={(e) => {
                      setDatetimeValue(e.target.value);
                      const deadline = e.target.value ? e.target.value + ':00' : null;
                      updateTask('deadline', deadline);
                    }}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Status</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={task.status}
                    onChange={(e) => updateTask('status', e.target.value as TaskStatus)}
                  >
                    {STATUSES.map(status => (
                      <option key={status} value={status}>
                        {status.replace('INPROGRESS', 'IN PROGRESS')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between items-center mt-8">
                  <button 
                    type="button" 
                    className="btn btn-error" 
                    onClick={handleDelete}
                  >
                    Delete Task
                  </button>
                  <div className="flex gap-3">
                    <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
  );
}
