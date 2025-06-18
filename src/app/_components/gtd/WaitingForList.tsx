"use client";

import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Clock, User, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function WaitingForList() {
  const { data: waitingTasks, refetch } = api.task.getWaitingFor.useQuery();
  
  const updateTask = api.task.update.useMutation({
    onSuccess: () => void refetch(),
  });

  const handleComplete = (taskId: string) => {
    updateTask.mutate({ 
      id: taskId, 
      completed: true 
    });
  };

  const handleConvertToAction = (taskId: string) => {
    updateTask.mutate({ 
      id: taskId, 
      taskType: "ACTION",
      isNextAction: true 
    });
  };

  if (!waitingTasks || waitingTasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            No items waiting for others.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {waitingTasks.map((task) => (
        <Card key={task.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                {task.description && (
                  <CardDescription className="mt-1">
                    {task.description}
                  </CardDescription>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleConvertToAction(task.id)}
                >
                  Convert to Action
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleComplete(task.id)}
                >
                  Complete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {task.waitingFor && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {task.waitingFor}
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Waiting for {formatDistanceToNow(new Date(task.createdAt))}
              </Badge>
              {task.dueDate && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </Badge>
              )}
              {task.project && (
                <Badge>{task.project.name}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}