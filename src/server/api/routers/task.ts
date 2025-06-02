import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { createTodoistService, type TodoistTask } from "~/server/services/todoist";

export const taskRouter = createTRPCRouter({
  // Get all tasks for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.task.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        labels: true,
      },
    });
  }),

  // Get a single task by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          labels: true,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      return task;
    }),

  // Create a new task
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.number().min(1).max(4).default(1),
        dueDate: z.date().optional(),
        labels: z.array(z.string()).default([]),
        syncToTodoist: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let todoistId: string | undefined;

      // Sync to Todoist if requested and user has API token
      if (input.syncToTodoist) {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { todoistApiToken: true },
        });

        if (user?.todoistApiToken) {
          const todoist = createTodoistService(user.todoistApiToken);
          if (todoist) {
            try {
              const todoistTask = await todoist.createTask({
                content: input.title,
                description: input.description,
                priority: 5 - input.priority, // Todoist uses reversed priority (4 = highest)
                due_date: input.dueDate?.toISOString().split("T")[0],
                labels: input.labels,
              });
              todoistId = todoistTask.id;
            } catch (error) {
              console.error("Failed to sync to Todoist:", error);
            }
          }
        }
      }

      return ctx.db.task.create({
        data: {
          title: input.title,
          description: input.description,
          priority: input.priority,
          dueDate: input.dueDate,
          todoistId,
          syncedAt: todoistId ? new Date() : null,
          userId: ctx.session.user.id,
          labels: {
            connectOrCreate: input.labels.map((labelName) => ({
              where: { name: labelName },
              create: { name: labelName },
            })),
          },
        },
        include: {
          labels: true,
        },
      });
    }),

  // Update a task
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        completed: z.boolean().optional(),
        priority: z.number().min(1).max(4).optional(),
        dueDate: z.date().nullable().optional(),
        labels: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingTask = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          labels: true,
        },
      });

      if (!existingTask) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // Sync to Todoist if task is linked
      if (existingTask.todoistId) {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { todoistApiToken: true },
        });

        if (user?.todoistApiToken) {
          const todoist = createTodoistService(user.todoistApiToken);
          if (todoist) {
            try {
              // Handle completion status change
              if (input.completed !== undefined && input.completed !== existingTask.completed) {
                if (input.completed) {
                  await todoist.closeTask(existingTask.todoistId);
                } else {
                  await todoist.reopenTask(existingTask.todoistId);
                }
              }

              // Update other fields
              const updateData: Record<string, unknown> = {};
              if (input.title !== undefined) updateData.content = input.title;
              if (input.description !== undefined) updateData.description = input.description;
              if (input.priority !== undefined) updateData.priority = 5 - input.priority;
              if (input.dueDate !== undefined) {
                updateData.due_date = input.dueDate ? input.dueDate.toISOString().split("T")[0] : null;
              }
              if (input.labels !== undefined) updateData.labels = input.labels;

              if (Object.keys(updateData).length > 0) {
                await todoist.updateTask(existingTask.todoistId, updateData);
              }
            } catch (error) {
              console.error("Failed to sync to Todoist:", error);
            }
          }
        }
      }

      // Prepare update data
      const updateData: any = {
        title: input.title,
        description: input.description,
        completed: input.completed,
        priority: input.priority,
        dueDate: input.dueDate,
        syncedAt: existingTask.todoistId ? new Date() : existingTask.syncedAt,
      };

      // Handle label updates
      if (input.labels !== undefined) {
        // Disconnect all existing labels
        await ctx.db.task.update({
          where: { id: input.id },
          data: {
            labels: {
              set: [], // This disconnects all labels
            },
          },
        });

        // Connect or create new labels
        updateData.labels = {
          connectOrCreate: input.labels.map((labelName) => ({
            where: { name: labelName },
            create: { name: labelName },
          })),
        };
      }

      return ctx.db.task.update({
        where: { id: input.id },
        data: updateData,
        include: {
          labels: true,
        },
      });
    }),

  // Delete a task
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existingTask = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!existingTask) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // Delete from Todoist if task is linked
      if (existingTask.todoistId) {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { todoistApiToken: true },
        });

        if (user?.todoistApiToken) {
          const todoist = createTodoistService(user.todoistApiToken);
          if (todoist) {
            try {
              await todoist.deleteTask(existingTask.todoistId);
            } catch (error) {
              console.error("Failed to delete from Todoist:", error);
            }
          }
        }
      }

      return ctx.db.task.delete({
        where: { id: input.id },
      });
    }),

  // Sync all tasks from Todoist
  syncFromTodoist: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { todoistApiToken: true },
    });

    if (!user?.todoistApiToken) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Todoist API token not configured",
      });
    }

    const todoist = createTodoistService(user.todoistApiToken);
    if (!todoist) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to initialize Todoist service",
      });
    }

    const todoistTasks = await todoist.getTasks();
    const existingTasks = await ctx.db.task.findMany({
      where: {
        userId: ctx.session.user.id,
        todoistId: { not: null },
      },
      include: {
        labels: true,
      },
    });

    const existingTodoistIds = new Set(
      existingTasks.map((t) => t.todoistId).filter(Boolean)
    );

    // Import new tasks from Todoist
    const newTasks = todoistTasks.filter((t) => !existingTodoistIds.has(t.id));
    
    for (const todoistTask of newTasks) {
      await ctx.db.task.create({
        data: {
          todoistId: todoistTask.id,
          title: todoistTask.content,
          description: todoistTask.description,
          completed: todoistTask.is_completed,
          priority: 5 - todoistTask.priority, // Convert Todoist priority
          dueDate: todoistTask.due?.date ? new Date(todoistTask.due.date) : null,
          syncedAt: new Date(),
          userId: ctx.session.user.id,
          labels: {
            connectOrCreate: (todoistTask.labels ?? []).map((labelName) => ({
              where: { name: labelName },
              create: { name: labelName },
            })),
          },
        },
      });
    }

    // Update existing tasks
    for (const existingTask of existingTasks) {
      const todoistTask = todoistTasks.find((t) => t.id === existingTask.todoistId);
      if (todoistTask) {
        // Disconnect all existing labels
        await ctx.db.task.update({
          where: { id: existingTask.id },
          data: {
            labels: {
              set: [], // This disconnects all labels
            },
          },
        });

        // Update task with new data and labels
        await ctx.db.task.update({
          where: { id: existingTask.id },
          data: {
            title: todoistTask.content,
            description: todoistTask.description,
            completed: todoistTask.is_completed,
            priority: 5 - todoistTask.priority,
            dueDate: todoistTask.due?.date ? new Date(todoistTask.due.date) : null,
            syncedAt: new Date(),
            labels: {
              connectOrCreate: (todoistTask.labels ?? []).map((labelName) => ({
                where: { name: labelName },
                create: { name: labelName },
              })),
            },
          },
        });
      }
    }

    return {
      imported: newTasks.length,
      updated: existingTasks.length,
    };
  }),

  // Update Todoist API token
  updateTodoistToken: protectedProcedure
    .input(z.object({ token: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { todoistApiToken: input.token },
      });
    }),

  // Get Todoist connection status
  getTodoistStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { todoistApiToken: true },
    });

    return {
      connected: !!user?.todoistApiToken,
    };
  }),
}); 