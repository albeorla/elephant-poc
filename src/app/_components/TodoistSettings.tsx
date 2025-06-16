"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function TodoistSettings() {
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  
  const utils = api.useUtils();
  const { data: todoistStatus } = api.task.getTodoistStatus.useQuery();
  
  const updateToken = api.task.updateTodoistToken.useMutation({
    onSuccess: () => {
      void utils.task.getTodoistStatus.invalidate();
      setApiToken("");
      alert("Todoist API token updated successfully!");
    },
    onError: (error) => {
      alert(`Failed to update token: ${error.message}`);
    },
  });

  const handleUpdateToken = () => {
    updateToken.mutate({ token: apiToken || undefined });
  };

  return (
    <div className="rounded-lg bg-white/10 p-6">
      <h3 className="mb-4 text-xl font-bold">Todoist Integration Settings</h3>
      
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm">
            Status: {todoistStatus?.connected ? (
              <span className="text-green-400">✅ Connected</span>
            ) : (
              <span className="text-yellow-400">⚠️ Not connected</span>
            )}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Todoist API Token
          </label>
          <p className="mb-2 text-xs text-gray-400">
            Get your API token from:{" "}
            <a 
              href="https://todoist.com/app/settings/integrations" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              Todoist Settings → Integrations
            </a>
          </p>
          <div className="flex gap-2">
            <input
              type={showToken ? "text" : "password"}
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder={todoistStatus?.connected ? "Enter new token to update" : "Enter your Todoist API token"}
              className="flex-1 rounded border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
            >
              {showToken ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleUpdateToken}
            disabled={updateToken.isPending || !apiToken.trim()}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {updateToken.isPending ? "Updating..." : todoistStatus?.connected ? "Update Token" : "Connect Todoist"}
          </button>
          
          {todoistStatus?.connected && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to disconnect Todoist?")) {
                  updateToken.mutate({ token: undefined });
                }
              }}
              disabled={updateToken.isPending}
              className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
            >
              Disconnect
            </button>
          )}
        </div>

        {todoistStatus?.connected && (
          <div className="mt-4 rounded bg-blue-500/10 p-3 text-sm">
            <p className="font-medium">ℹ️ Sync Information</p>
            <ul className="mt-1 list-inside list-disc text-xs">
              <li>Tasks created with &quot;Sync to Todoist&quot; enabled will appear in your Todoist</li>
              <li>Updates to synced tasks will be reflected in both systems</li>
              <li>Use the &quot;Sync from Todoist&quot; button to import your existing Todoist tasks</li>
              <li>Deleting a synced task will remove it from both systems</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 