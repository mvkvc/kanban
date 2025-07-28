import React from 'react';
import { Routes, Route } from 'react-router-dom';
import KanbanBoard from './components/KanbanBoard';
import TaskDetails from './components/TaskDetails';
import ErrorBoundary from './components/ErrorBoundary';

function ErrorPage() {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-base-200">
      <div className="alert alert-error max-w-md">
        <span>Page not found. Redirecting to home...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<KanbanBoard />} />
        <Route path="/task/:id" element={<TaskDetails />} />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
