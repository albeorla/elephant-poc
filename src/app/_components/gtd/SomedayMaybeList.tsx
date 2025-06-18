"use client";

import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Lightbulb, ArrowRight, Trash2 } from "lucide-react";

export function SomedayMaybeList() {
  const { data: somedayTasks, refetch } = api.task.getSomedayMaybe.useQuery();
  
  const updateTask = api.task.update.useMutation({
    onSuccess: () => void refetch(),
  });

  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => void refetch(),
  });

  const handleActivate = (taskId: string) => {
    updateTask.mutate({ 
      id: taskId, 
      taskType: "INBOX" // Send back to inbox for processing
    });
  };

  const handleDelete = (taskId: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteTask.mutate({ id: taskId });
    }
  };

  if (!somedayTasks || somedayTasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            No someday/maybe items yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {somedayTasks.map((task) => (
        <Card key={task.id} className="relative">
          <CardHeader>
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <CardTitle className="text-base">{task.title}</CardTitle>
                {task.description && (
                  <CardDescription className="mt-1">
                    {task.description}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {task.labels.map((label: any) => (
                  <Badge key={label.id} variant="secondary" className="text-xs">
                    {label.name}
                  </Badge>
                ))}
                {task.project && (
                  <Badge variant="outline" className="text-xs">
                    {task.project.name}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleActivate(task.id)}
                  className="flex-1"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}