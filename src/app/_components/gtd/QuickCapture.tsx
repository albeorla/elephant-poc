"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  
  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      toast.success("Task added to inbox");
      setTitle("");
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to create task");
    },
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createTask.mutate({ title: title.trim() });
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Quick capture (Cmd+N)</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Capture</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              disabled={createTask.isPending}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createTask.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || createTask.isPending}
              >
                Add to Inbox
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground">
            Tip: Press Cmd+N (or Ctrl+N) to quickly capture a task
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}