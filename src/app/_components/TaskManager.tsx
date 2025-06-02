"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { TodoistSettings } from "./TodoistSettings";

export function TaskManager() {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [syncToTodoist, setSyncToTodoist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const utils = api.useUtils();
  
  // Queries
  const { data: tasks, isLoading } = api.task.getAll.useQuery();
  const { data: todoistStatus } = api.task.getTodoistStatus.useQuery();

  // Mutations
  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
      setNewTaskTitle("");
    },
  });

  const updateTask = api.task.update.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
    },
  });

  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
    },
  });

  const syncFromTodoist = api.task.syncFromTodoist.useMutation({
    onSuccess: (result) => {
      void utils.task.getAll.invalidate();
      alert(`Synced! Imported: ${result.imported}, Updated: ${result.updated}`);
    },
    onError: (error) => {
      alert(`Sync failed: ${error.message}`);
    },
  });

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    
    createTask.mutate({
      title: newTaskTitle,
      syncToTodoist,
      priority: 2,
      labels: [],
    });
  };

  const toggleTaskComplete = (taskId: string, currentStatus: boolean) => {
    updateTask.mutate({
      id: taskId,
      completed: !currentStatus,
    });
  };

  if (isLoading) return <div>Loading tasks...</div>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Task Manager</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Todoist: {todoistStatus?.connected ? "Connected" : "Not connected"}
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700"
          >
            {showSettings ? "Hide Settings" : "Settings"}
          </button>
          {todoistStatus?.connected && (
            <button
              onClick={() => syncFromTodoist.mutate()}
              disabled={syncFromTodoist.isPending}
              className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {syncFromTodoist.isPending ? "Syncing..." : "Sync from Todoist"}
            </button>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="mb-4">
          <TodoistSettings />
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
          placeholder="Add a new task..."
          className="flex-1 rounded border px-3 py-2"
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={syncToTodoist}
            onChange={(e) => setSyncToTodoist(e.target.checked)}
            disabled={!todoistStatus?.connected}
          />
          <span className="text-sm">Sync to Todoist</span>
        </label>
        <button
          onClick={handleCreateTask}
          disabled={createTask.isPending}
          className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
        >
          {createTask.isPending ? "Adding..." : "Add Task"}
        </button>
      </div>

      <div className="space-y-2">
        {tasks?.map((task: any) => (
          <div
            key={task.id}
            className="flex items-center justify-between rounded border p-3"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTaskComplete(task.id, task.completed)}
                className="h-5 w-5"
              />
              <div>
                <h3 className={`font-medium ${task.completed ? "line-through text-gray-500" : ""}`}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-gray-600">{task.description}</p>
                )}
                <div className="flex gap-2 text-xs text-gray-500">
                  {task.todoistId && <span>📱 Synced</span>}
                  {task.dueDate && (
                    <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>
                  )}
                  {task.labels && task.labels.length > 0 && (
                    <span>🏷️ {task.labels.map((label: any) => label.name).join(", ")}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => deleteTask.mutate({ id: task.id })}
              disabled={deleteTask.isPending}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {tasks?.length === 0 && (
        <p className="text-center text-gray-500">No tasks yet. Create one above!</p>
      )}
    </div>
  );
} 