"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { TaskType, EnergyLevel } from "@prisma/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Textarea } from "~/components/ui/textarea";
import { Clock, Zap, Phone, Home, Briefcase, Computer, ShoppingCart, Inbox, CheckSquare, Archive } from "lucide-react";

const CONTEXTS = [
  { value: "@home", label: "Home", icon: Home },
  { value: "@office", label: "Office", icon: Briefcase },
  { value: "@phone", label: "Phone", icon: Phone },
  { value: "@computer", label: "Computer", icon: Computer },
  { value: "@errands", label: "Errands", icon: ShoppingCart },
];

const ENERGY_LEVELS = [
  { value: "HIGH", label: "High Energy", color: "text-red-500" },
  { value: "MEDIUM", label: "Medium Energy", color: "text-yellow-500" },
  { value: "LOW", label: "Low Energy", color: "text-green-500" },
];

export function InboxProcessor() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processingNotes, setProcessingNotes] = useState("");
  const [showActionableOptions, setShowActionableOptions] = useState(false);
  const [showNonActionableOptions, setShowNonActionableOptions] = useState(false);
  const [context, setContext] = useState<string>("");
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | "">("");
  const [timeEstimate, setTimeEstimate] = useState("");
  const [waitingFor, setWaitingFor] = useState("");
  const [isNextAction, setIsNextAction] = useState(false);
  
  const { data: inboxTasks, refetch } = api.task.getInbox.useQuery();
  const processTask = api.task.processInboxItem.useMutation({
    onSuccess: () => {
      void refetch();
      resetForm();
      if (inboxTasks && currentIndex >= inboxTasks.length - 1) {
        setCurrentIndex(0);
      }
    },
  });

  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => {
      void refetch();
      resetForm();
    },
  });

  const currentTask = inboxTasks?.[currentIndex];

  const resetForm = () => {
    setProcessingNotes("");
    setShowActionableOptions(false);
    setShowNonActionableOptions(false);
    setContext("");
    setEnergyLevel("");
    setTimeEstimate("");
    setWaitingFor("");
    setIsNextAction(false);
  };

  if (!inboxTasks || inboxTasks.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl border-dashed">
        <CardHeader className="text-center pb-8 pt-12">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Inbox className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Inbox Zero! 🎉</CardTitle>
          <CardDescription className="mt-2 text-base">
            You've processed all items in your inbox. Great job maintaining clarity!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!currentTask) return null;

  const handleProcess = (
    taskType: TaskType,
    options?: {
      context?: string;
      energyLevel?: EnergyLevel;
      timeEstimate?: number;
      isNextAction?: boolean;
      waitingFor?: string;
      projectId?: string;
    }
  ) => {
    processTask.mutate({
      id: currentTask.id,
      taskType,
      ...options,
      notes: processingNotes,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate({ id: currentTask.id });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <span className="text-sm font-semibold">{currentIndex + 1}</span>
          </div>
          <div>
            <p className="text-sm font-medium">Processing Inbox</p>
            <p className="text-xs text-muted-foreground">{inboxTasks.length - currentIndex - 1} items remaining</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex(Math.min(inboxTasks.length - 1, currentIndex + 1))}
            disabled={currentIndex === inboxTasks.length - 1}
          >
            Skip
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl">{currentTask.title}</CardTitle>
            {currentTask.priority && (
              <Badge variant={currentTask.priority > 2 ? "destructive" : "secondary"}>
                P{currentTask.priority}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentTask.description && (
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-sm leading-relaxed">{currentTask.description}</p>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              {currentTask.labels.map((label: any) => (
                <Badge key={label.id} variant="secondary">{label.name}</Badge>
              ))}
              {currentTask.dueDate && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(currentTask.dueDate).toLocaleDateString()}
                </Badge>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Processing Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={processingNotes}
                onChange={(e) => setProcessingNotes(e.target.value)}
                placeholder="Add any notes about this task..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!showActionableOptions && !showNonActionableOptions && (
        <Card className="border-2 border-dashed">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Is it actionable?</CardTitle>
            <CardDescription className="text-base">
              Can you do something about this item?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <Button
                size="lg"
                variant="default"
                onClick={() => setShowActionableOptions(true)}
                className="h-32 flex-col gap-3 text-base"
              >
                <CheckSquare className="h-8 w-8" />
                <div>
                  <div className="font-semibold">Yes, it's actionable</div>
                  <div className="text-xs font-normal opacity-80">I can do something about this</div>
                </div>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowNonActionableOptions(true)}
                className="h-32 flex-col gap-3 text-base"
              >
                <Archive className="h-8 w-8" />
                <div>
                  <div className="font-semibold">No, not actionable</div>
                  <div className="text-xs font-normal opacity-80">Reference, someday, or trash</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showActionableOptions && (
        <Card>
          <CardHeader>
            <CardTitle>Process as Actionable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="context">Context</Label>
                <Select value={context} onValueChange={setContext}>
                  <SelectTrigger id="context">
                    <SelectValue placeholder="Select context" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="energy">Energy Level</Label>
                <Select value={energyLevel} onValueChange={(v) => setEnergyLevel(v as EnergyLevel | "")}>
                  <SelectTrigger id="energy">
                    <SelectValue placeholder="Select energy" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENERGY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-center gap-2">
                          <Zap className={`h-4 w-4 ${level.color}`} />
                          {level.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time">Time Estimate (minutes)</Label>
                <Input
                  id="time"
                  type="number"
                  value={timeEstimate}
                  onChange={(e) => setTimeEstimate(e.target.value)}
                  placeholder="e.g., 30"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="nextAction"
                  checked={isNextAction}
                  onChange={(e) => setIsNextAction(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="nextAction" className="cursor-pointer">
                  Mark as Next Action
                </Label>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="default"
                onClick={() => handleProcess("ACTION", {
                  context,
                  energyLevel: energyLevel as EnergyLevel || undefined,
                  timeEstimate: timeEstimate ? parseInt(timeEstimate) : undefined,
                  isNextAction,
                })}
                disabled={!context}
              >
                Process as Single Action
              </Button>

              <Button
                variant="outline"
                onClick={() => handleProcess("PROJECT", {
                  context,
                  energyLevel: energyLevel as EnergyLevel || undefined,
                  isNextAction: true, // Projects always need a next action
                })}
              >
                Convert to Project
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const who = prompt("Who are you waiting for?");
                  if (who) {
                    handleProcess("WAITING", { waitingFor: who });
                  }
                }}
              >
                Delegate/Waiting For
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showNonActionableOptions && (
        <Card>
          <CardHeader>
            <CardTitle>Process as Non-Actionable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleProcess("REFERENCE")}
                className="h-24"
              >
                Reference Material
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleProcess("SOMEDAY")}
                className="h-24"
              >
                Someday/Maybe
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={handleDelete}
                className="h-24"
              >
                Delete/Trash
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}