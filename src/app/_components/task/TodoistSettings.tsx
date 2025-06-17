"use client";

import { useState } from "react";
import { Eye, EyeOff, Link, Unlink, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";

export function TodoistSettings() {
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const utils = api.useUtils();
  const { data: todoistStatus } = api.task.getTodoistStatus.useQuery();

  const updateToken = api.task.updateTodoistToken.useMutation({
    onSuccess: () => {
      void utils.task.getTodoistStatus.invalidate();
      setApiToken("");
      toast.success("Todoist API token updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update token: ${error.message}`);
    },
  });

  const handleUpdateToken = () => {
    updateToken.mutate({ token: apiToken || undefined });
  };

  const handleDisconnect = () => {
    if (window.confirm("Are you sure you want to disconnect Todoist?")) {
      updateToken.mutate({ token: undefined });
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <Label>Connection Status:</Label>
        {todoistStatus?.connected ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Not connected
          </Badge>
        )}
      </div>

      {/* API Token Input */}
      <div className="space-y-2">
        <Label htmlFor="api-token">Todoist API Token</Label>
        <p className="text-sm text-muted-foreground">
          Get your API token from{" "}
          <a
            href="https://todoist.com/app/settings/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
          >
            Todoist Settings → Integrations
          </a>
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="api-token"
              type={showToken ? "text" : "password"}
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder={
                todoistStatus?.connected
                  ? "Enter new token to update"
                  : "Enter your Todoist API token"
              }
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleUpdateToken}
          disabled={updateToken.isPending || !apiToken.trim()}
          className="gap-2"
        >
          <Link className="h-4 w-4" />
          {updateToken.isPending
            ? "Updating..."
            : todoistStatus?.connected
              ? "Update Token"
              : "Connect Todoist"}
        </Button>

        {todoistStatus?.connected && (
          <Button
            onClick={handleDisconnect}
            disabled={updateToken.isPending}
            variant="destructive"
            className="gap-2"
          >
            <Unlink className="h-4 w-4" />
            Disconnect
          </Button>
        )}
      </div>

      {/* Information Panel */}
      {todoistStatus?.connected && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <p className="font-medium">Sync Information</p>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Tasks created with "Sync to Todoist" enabled will appear in your Todoist</li>
            <li>• Updates to synced tasks will be reflected in both systems</li>
            <li>• Use the "Sync from Todoist" button to import your existing Todoist tasks</li>
            <li>• Deleting a synced task will remove it from both systems</li>
          </ul>
        </div>
      )}
    </div>
  );
}
