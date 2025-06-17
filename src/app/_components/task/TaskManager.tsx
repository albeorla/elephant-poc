"use client";

import { useState } from "react";
import { Plus, Settings, RefreshCw, Trash2, Calendar, Tag, Smartphone, FolderPlus, Folder } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { TodoistSettings } from "./TodoistSettings";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { ThemeToggle } from "~/components/theme-toggle";

export function TaskManager() {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [syncToTodoist, setSyncToTodoist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [newProjectName, setNewProjectName] = useState("");
  const [syncProjectToTodoist, setSyncProjectToTodoist] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [filterProjectId, setFilterProjectId] = useState<string>("all");

  const utils = api.useUtils();

  // Queries
  const { data: tasks, isLoading } = api.task.getAll.useQuery();
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery();
  const { data: todoistStatus } = api.task.getTodoistStatus.useQuery();

  // Mutations
  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
      setNewTaskTitle("");
      toast.success("Task created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const updateTask = api.task.update.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
      toast.success("Task updated!");
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
      toast.success("Task deleted!");
    },
    onError: (error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });

  // Project mutations
  const createProject = api.project.create.useMutation({
    onSuccess: () => {
      void utils.project.getAll.invalidate();
      setNewProjectName("");
      setShowProjectForm(false);
      toast.success("Project created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  // Unified sync mutation
  const syncAllFromTodoist = api.task.syncAllFromTodoist.useMutation({
    onSuccess: (result) => {
      void utils.task.getAll.invalidate();
      void utils.project.getAll.invalidate();
      toast.success(
        `Sync complete! Projects: ${result.projects.imported}/${result.projects.updated}, ` +
        `Sections: ${result.sections.imported}/${result.sections.updated}, ` +
        `Tasks: ${result.tasks.imported}/${result.tasks.updated} (imported/updated)`
      );
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    createTask.mutate({
      title: newTaskTitle,
      syncToTodoist,
      priority: 2,
      labels: [],
      projectId: selectedProjectId,
    });
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    createProject.mutate({
      name: newProjectName,
      syncToTodoist: syncProjectToTodoist,
    });
  };

  const toggleTaskComplete = (taskId: string, currentStatus: boolean) => {
    updateTask.mutate({
      id: taskId,
      completed: !currentStatus,
    });
  };

  if (isLoading || projectsLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📋 Task Manager
              </CardTitle>
              <CardDescription>
                Todoist: {todoistStatus?.connected ? (
                  <Badge variant="default" className="ml-1">Connected</Badge>
                ) : (
                  <Badge variant="secondary" className="ml-1">Not connected</Badge>
                )}
                {syncAllFromTodoist.isPending && (
                  <Badge variant="outline" className="ml-2">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Syncing...
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Todoist Settings</DialogTitle>
                    <DialogDescription>
                      Configure your Todoist integration
                    </DialogDescription>
                  </DialogHeader>
                  <TodoistSettings />
                </DialogContent>
              </Dialog>
              
              {todoistStatus?.connected && (
                <Button
                  onClick={() => syncAllFromTodoist.mutate()}
                  disabled={syncAllFromTodoist.isPending}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 ${syncAllFromTodoist.isPending ? 'animate-spin' : ''}`} />
                  {syncAllFromTodoist.isPending ? "Syncing..." : "Sync All"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Project Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Projects
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowProjectForm(!showProjectForm)}
                variant="outline"
                size="sm"
              >
                <FolderPlus className="h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Project Creation Form */}
          {showProjectForm && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex gap-3">
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  placeholder="Project name"
                  className="flex-1"
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sync-project-todoist"
                    checked={syncProjectToTodoist}
                    onCheckedChange={(checked) => setSyncProjectToTodoist(Boolean(checked))}
                    disabled={!todoistStatus?.connected}
                  />
                  <label
                    htmlFor="sync-project-todoist"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Sync to Todoist
                  </label>
                </div>
                <Button
                  onClick={handleCreateProject}
                  disabled={createProject.isPending}
                  size="sm"
                >
                  {createProject.isPending ? "Creating..." : "Create"}
                </Button>
                <Button
                  onClick={() => setShowProjectForm(false)}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.map((project) => (
              <div
                key={project.id}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedProjectId(selectedProjectId === project.id ? undefined : project.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color ?? '#6366f1' }}
                    />
                    <span className="font-medium text-sm">{project.name}</span>
                    {selectedProjectId === project.id && (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {project.todoistId && (
                      <Badge variant="outline" className="text-xs">
                        <Smartphone className="h-3 w-3" />
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {project._count?.tasks ?? 0}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {projects?.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No projects yet. Create your first project above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Task Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                placeholder="What needs to be done?"
                className="flex-1"
              />
              <Select value={selectedProjectId ?? "none"} onValueChange={(value) => setSelectedProjectId(value === "none" ? undefined : value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: project.color ?? '#6366f1' }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleCreateTask}
                disabled={createTask.isPending}
              >
                <Plus className="h-4 w-4" />
                {createTask.isPending ? "Adding..." : "Add Task"}
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sync-todoist"
                checked={syncToTodoist}
                onCheckedChange={(checked) => setSyncToTodoist(Boolean(checked))}
                disabled={!todoistStatus?.connected}
              />
              <label
                htmlFor="sync-todoist"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Sync to Todoist
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium">Filter by project:</span>
            <Select value={filterProjectId} onValueChange={setFilterProjectId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tasks</SelectItem>
                <SelectItem value="no-project">No project</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: project.color ?? '#6366f1' }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks?.filter((task) => {
          if (filterProjectId === "all") return true;
          if (filterProjectId === "no-project") return !task.projectId;
          return task.projectId === filterProjectId;
        }).map((task) => (
          <Card key={task.id} className="transition-all hover:shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTaskComplete(task.id, task.completed)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <h3 className={`font-medium leading-none ${
                      task.completed ? "text-muted-foreground line-through" : ""
                    }`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {task.project && (
                        <Badge variant="outline" className="text-xs">
                          <Folder className="h-3 w-3 mr-1" />
                          {task.project.name}
                        </Badge>
                      )}
                      {task.section && (
                        <Badge variant="outline" className="text-xs">
                          📂 {task.section.name}
                        </Badge>
                      )}
                      {task.todoistId && (
                        <Badge variant="outline" className="text-xs">
                          <Smartphone className="h-3 w-3 mr-1" />
                          Synced
                        </Badge>
                      )}
                      {task.dueDate && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </Badge>
                      )}
                      {task.labels && task.labels.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {task.labels.map((label) => label.name).join(", ")}
                        </Badge>
                      )}
                      {task.priority > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          P{task.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => deleteTask.mutate({ id: task.id })}
                  disabled={deleteTask.isPending}
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {tasks?.filter((task) => {
        if (filterProjectId === "all") return true;
        if (filterProjectId === "no-project") return !task.projectId;
        return task.projectId === filterProjectId;
      }).length === 0 && tasks && tasks.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4">
                🔍
              </div>
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-4">
                No tasks match the selected filter
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No tasks at all */}
      {tasks?.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4">
                📝
              </div>
              <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first task above
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
