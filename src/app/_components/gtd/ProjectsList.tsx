"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { ProjectType, ProjectStatus } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { 
  FolderOpen, 
  Target, 
  Briefcase, 
  BookOpen, 
  Archive,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

const PROJECT_TYPE_CONFIG = {
  PROJECT: {
    label: "Projects",
    icon: Target,
    color: "text-blue-500",
    description: "Active projects with specific outcomes",
  },
  AREA: {
    label: "Areas",
    icon: Briefcase,
    color: "text-green-500",
    description: "Ongoing responsibilities to maintain",
  },
  RESOURCE: {
    label: "Resources",
    icon: BookOpen,
    color: "text-purple-500",
    description: "Reference materials and information",
  },
  ARCHIVE: {
    label: "Archive",
    icon: Archive,
    color: "text-gray-500",
    description: "Completed and inactive items",
  },
};

export function ProjectsList() {
  const [selectedType, setSelectedType] = useState<ProjectType>("PROJECT");
  
  const { data: projects, refetch } = api.project.getByType.useQuery({
    projectType: selectedType,
    status: selectedType === "ARCHIVE" ? "ARCHIVED" : undefined,
  });

  const archiveProject = api.project.archiveProject.useMutation({
    onSuccess: () => void refetch(),
  });

  const convertType = api.project.convertProjectType.useMutation({
    onSuccess: () => void refetch(),
  });

  const getProjectProgress = (project: any) => {
    if (!project._count?.tasks || project._count.tasks === 0) return 0;
    const completedTasks = project.tasks?.filter((t: any) => t.completed).length || 0;
    return Math.round((completedTasks / project._count.tasks) * 100);
  };

  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "ON_HOLD":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case "ARCHIVED":
        return <Archive className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as ProjectType)}>
        <TabsList className="grid w-full grid-cols-4">
          {Object.entries(PROJECT_TYPE_CONFIG).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={type} value={type} className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                {config.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(PROJECT_TYPE_CONFIG).map(([type, config]) => (
          <TabsContent key={type} value={type} className="space-y-4">
            <Card>
              <CardHeader>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
            </Card>

            {!projects || projects.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No {config.label.toLowerCase()} found.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Card key={project.id} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5" />
                            {project.name}
                          </CardTitle>
                          {project.outcome && (
                            <CardDescription className="mt-2">
                              {project.outcome}
                            </CardDescription>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {selectedType !== "ARCHIVE" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => archiveProject.mutate({ id: project.id })}
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                                {selectedType === "PROJECT" && (
                                  <DropdownMenuItem
                                    onClick={() => convertType.mutate({ 
                                      id: project.id, 
                                      projectType: "AREA" 
                                    })}
                                  >
                                    <Briefcase className="mr-2 h-4 w-4" />
                                    Convert to Area
                                  </DropdownMenuItem>
                                )}
                                {selectedType === "AREA" && (
                                  <DropdownMenuItem
                                    onClick={() => convertType.mutate({ 
                                      id: project.id, 
                                      projectType: "PROJECT" 
                                    })}
                                  >
                                    <Target className="mr-2 h-4 w-4" />
                                    Convert to Project
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(project.status)}
                          <span className="text-sm text-muted-foreground">
                            {project.status.toLowerCase()}
                          </span>
                        </div>

                        {project._count?.tasks > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{getProjectProgress(project)}%</span>
                            </div>
                            <Progress value={getProjectProgress(project)} />
                            <p className="text-xs text-muted-foreground">
                              {project._count.tasks} tasks
                            </p>
                          </div>
                        )}

                        {project.reviewInterval && (
                          <Badge variant="outline" className="text-xs">
                            Review: {project.reviewInterval.toLowerCase()}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}