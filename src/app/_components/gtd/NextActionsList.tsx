"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { EnergyLevel } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Clock, Zap, Phone, Home, Briefcase, Computer, ShoppingCart, Calendar } from "lucide-react";

const CONTEXTS = [
  { value: "@home", label: "Home", icon: Home },
  { value: "@office", label: "Office", icon: Briefcase },
  { value: "@phone", label: "Phone", icon: Phone },
  { value: "@computer", label: "Computer", icon: Computer },
  { value: "@errands", label: "Errands", icon: ShoppingCart },
];

const ENERGY_LEVELS = [
  { value: "HIGH", label: "High Energy", color: "text-red-500", icon: "🔥" },
  { value: "MEDIUM", label: "Medium Energy", color: "text-yellow-500", icon: "⚡" },
  { value: "LOW", label: "Low Energy", color: "text-green-500", icon: "🌱" },
];

export function NextActionsList() {
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel | "">("");
  const [maxTime, setMaxTime] = useState<string>("");

  const { data: nextActions, refetch } = api.task.getNextActions.useQuery({
    context: selectedContext || undefined,
    energyLevel: selectedEnergy as EnergyLevel || undefined,
    maxTime: maxTime ? parseInt(maxTime) : undefined,
  });

  const updateTask = api.task.update.useMutation({
    onSuccess: () => void refetch(),
  });

  const handleComplete = (taskId: string) => {
    updateTask.mutate({ id: taskId, completed: true });
  };

  const groupedActions = nextActions?.reduce((acc, task) => {
    const context = task.context || "No Context";
    if (!acc[context]) {
      acc[context] = [];
    }
    acc[context].push(task);
    return acc;
  }, {} as Record<string, NonNullable<typeof nextActions>>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter Next Actions</CardTitle>
          <CardDescription>
            Filter your next actions by context, energy level, and available time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="context-filter">Context</Label>
              <Select value={selectedContext} onValueChange={setSelectedContext}>
                <SelectTrigger id="context-filter">
                  <SelectValue placeholder="All contexts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All contexts</SelectItem>
                  {CONTEXTS.map((ctx) => (
                    <SelectItem key={ctx.value} value={ctx.value}>
                      <div className="flex items-center gap-2">
                        <ctx.icon className="h-4 w-4" />
                        {ctx.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="energy-filter">Energy Level</Label>
              <Select value={selectedEnergy} onValueChange={(v) => setSelectedEnergy(v as EnergyLevel | "")}>
                <SelectTrigger id="energy-filter">
                  <SelectValue placeholder="All energy levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All energy levels</SelectItem>
                  {ENERGY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <span>{level.icon}</span>
                        <span className={level.color}>{level.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="time-filter">Max Time (minutes)</Label>
              <Select value={maxTime} onValueChange={setMaxTime}>
                <SelectTrigger id="time-filter">
                  <SelectValue placeholder="Any duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any duration</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!nextActions || nextActions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No next actions found. Process your inbox to create some!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedActions || {}).map(([context, tasks]) => (
            <Card key={context}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {CONTEXTS.find(c => c.value === context)?.icon && (
                    <>{(() => {
                      const Icon = CONTEXTS.find(c => c.value === context)!.icon;
                      return <Icon className="h-5 w-5" />;
                    })()}</>
                  )}
                  {context}
                  <Badge variant="secondary">{tasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleComplete(task.id)}
                      />
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {task.energyLevel && (
                            <Badge variant="outline" className="text-xs">
                              {ENERGY_LEVELS.find(e => e.value === task.energyLevel)?.icon}{" "}
                              {task.energyLevel.toLowerCase()}
                            </Badge>
                          )}
                          {task.timeEstimate && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="mr-1 h-3 w-3" />
                              {task.timeEstimate}m
                            </Badge>
                          )}
                          {task.dueDate && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="mr-1 h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                          {task.project && (
                            <Badge variant="secondary" className="text-xs">
                              {task.project.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}