import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createTodoistService } from "~/server/services/todoist";
import { TaskType, EnergyLevel } from "@prisma/client";

export const taskRouter = createTRPCRouter({
  // Get all tasks for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.task.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        labels: true,
        project: true,
        section: true,
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
          project: true,
          section: true,
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
        projectId: z.string().optional(),
        sectionId: z.string().optional(),
        syncToTodoist: z.boolean().default(false),
      }),
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
          projectId: input.projectId,
          sectionId: input.sectionId,
          todoistId,
          syncedAt: todoistId ? new Date() : null,
          userId: ctx.session.user.id,
          taskType: "INBOX", // New tasks default to inbox
          labels: {
            connectOrCreate: input.labels.map((labelName) => ({
              where: { name: labelName },
              create: { name: labelName },
            })),
          },
        },
        include: {
          labels: true,
          project: true,
          section: true,
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
        projectId: z.string().nullable().optional(),
        sectionId: z.string().nullable().optional(),
        taskType: z.nativeEnum(TaskType).optional(),
        context: z.string().optional(),
        energyLevel: z.nativeEnum(EnergyLevel).optional(),
        timeEstimate: z.number().optional(),
        isNextAction: z.boolean().optional(),
        waitingFor: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingTask = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          labels: true,
          project: true,
          section: true,
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
              if (
                input.completed !== undefined &&
                input.completed !== existingTask.completed
              ) {
                if (input.completed) {
                  await todoist.closeTask(existingTask.todoistId);
                } else {
                  await todoist.reopenTask(existingTask.todoistId);
                }
              }

              // Update other fields
              const updateData: Record<string, unknown> = {};
              if (input.title !== undefined) updateData.content = input.title;
              if (input.description !== undefined)
                updateData.description = input.description;
              if (input.priority !== undefined)
                updateData.priority = 5 - input.priority;
              if (input.dueDate !== undefined) {
                updateData.due_date = input.dueDate
                  ? input.dueDate.toISOString().split("T")[0]
                  : null;
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

      // Handle label updates
      if (input.labels !== undefined) {
        // Disconnect all existing labels first
        await ctx.db.task.update({
          where: { id: input.id },
          data: {
            labels: {
              set: [], // This disconnects all labels
            },
          },
        });
      }

      // Prepare update data
      const updateData = {
        title: input.title,
        description: input.description,
        completed: input.completed,
        priority: input.priority,
        dueDate: input.dueDate,
        projectId: input.projectId,
        sectionId: input.sectionId,
        syncedAt: existingTask.todoistId ? new Date() : existingTask.syncedAt,
        ...(input.labels !== undefined && {
          labels: {
            connectOrCreate: input.labels.map((labelName) => ({
              where: { name: labelName },
              create: { name: labelName },
            })),
          },
        }),
      };

      return ctx.db.task.update({
        where: { id: input.id },
        data: updateData,
        include: {
          labels: true,
          project: true,
          section: true,
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
    try {
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
          project: true,
          section: true,
        },
      });

      const existingTodoistIds = new Set(
        existingTasks.map((t) => t.todoistId).filter(Boolean),
      );

      // Import new tasks from Todoist
      const newTasks = todoistTasks.filter((t) => !existingTodoistIds.has(t.id));

      for (const todoistTask of newTasks) {
        // Find or create project if specified
        let projectId: string | null = null;
        let sectionId: string | null = null;

        if (todoistTask.project_id) {
          const existingProject = await ctx.db.project.findFirst({
            where: {
              todoistId: todoistTask.project_id,
              userId: ctx.session.user.id,
            },
          });
          projectId = existingProject?.id || null;
        }

        if (todoistTask.section_id && projectId) {
          const existingSection = await ctx.db.section.findFirst({
            where: {
              todoistId: todoistTask.section_id,
              projectId: projectId,
            },
          });
          sectionId = existingSection?.id || null;
        }

        await ctx.db.task.create({
          data: {
            todoistId: todoistTask.id,
            title: todoistTask.content,
            description: todoistTask.description,
            completed: todoistTask.is_completed,
            priority: 5 - todoistTask.priority, // Convert Todoist priority
            dueDate: todoistTask.due?.date
              ? new Date(todoistTask.due.date)
              : null,
            syncedAt: new Date(),
            userId: ctx.session.user.id,
            projectId,
            sectionId,
            order: todoistTask.order || 0,
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
        const todoistTask = todoistTasks.find(
          (t) => t.id === existingTask.todoistId,
        );
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

          // Find or update project/section references
          let projectId: string | null = null;
          let sectionId: string | null = null;

          if (todoistTask.project_id) {
            const existingProject = await ctx.db.project.findFirst({
              where: {
                todoistId: todoistTask.project_id,
                userId: ctx.session.user.id,
              },
            });
            projectId = existingProject?.id || null;
          }

          if (todoistTask.section_id && projectId) {
            const existingSection = await ctx.db.section.findFirst({
              where: {
                todoistId: todoistTask.section_id,
                projectId: projectId,
              },
            });
            sectionId = existingSection?.id || null;
          }

          // Update task with new data and labels
          await ctx.db.task.update({
            where: { id: existingTask.id },
            data: {
              title: todoistTask.content,
              description: todoistTask.description,
              completed: todoistTask.is_completed,
              priority: 5 - todoistTask.priority,
              dueDate: todoistTask.due?.date
                ? new Date(todoistTask.due.date)
                : null,
              syncedAt: new Date(),
              projectId,
              sectionId,
              order: todoistTask.order || 0,
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
    } catch (error) {
      console.error("Error syncing from Todoist:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to sync from Todoist",
      });
    }
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

  // Get inbox tasks (unprocessed items)
  getInbox: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.task.findMany({
      where: {
        userId: ctx.session.user.id,
        taskType: "INBOX",
        completed: false,
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "asc" },
      ],
      include: {
        labels: true,
        project: true,
        section: true,
      },
    });
  }),

  // Get next actions
  getNextActions: protectedProcedure
    .input(
      z.object({
        context: z.string().optional(),
        energyLevel: z.nativeEnum(EnergyLevel).optional(),
        maxTime: z.number().optional(), // max time in minutes
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.session.user.id,
        isNextAction: true,
        completed: false,
        taskType: { in: ["ACTION", "PROJECT"] },
      };

      if (input?.context) {
        where.context = input.context;
      }

      if (input?.energyLevel) {
        where.energyLevel = input.energyLevel;
      }

      if (input?.maxTime) {
        where.timeEstimate = { lte: input.maxTime };
      }

      return ctx.db.task.findMany({
        where,
        orderBy: [
          { priority: "desc" },
          { dueDate: "asc" },
        ],
        include: {
          labels: true,
          project: true,
          section: true,
        },
      });
    }),

  // Get waiting for tasks
  getWaitingFor: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.task.findMany({
      where: {
        userId: ctx.session.user.id,
        taskType: "WAITING",
        completed: false,
      },
      orderBy: { createdAt: "desc" },
      include: {
        labels: true,
        project: true,
        section: true,
      },
    });
  }),

  // Get someday/maybe tasks
  getSomedayMaybe: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.task.findMany({
      where: {
        userId: ctx.session.user.id,
        taskType: "SOMEDAY",
        completed: false,
      },
      orderBy: { createdAt: "desc" },
      include: {
        labels: true,
        project: true,
        section: true,
      },
    });
  }),

  // Process inbox item
  processInboxItem: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        taskType: z.nativeEnum(TaskType),
        context: z.string().optional(),
        energyLevel: z.nativeEnum(EnergyLevel).optional(),
        timeEstimate: z.number().optional(),
        isNextAction: z.boolean().optional(),
        waitingFor: z.string().optional(),
        projectId: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, notes, ...updateData } = input;

      // Get the existing task first
      const existingTask = await ctx.db.task.findFirst({
        where: { id, userId: ctx.session.user.id },
      });

      if (!existingTask) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // Update the task
      const updatedTask = await ctx.db.task.update({
        where: { id },
        data: {
          ...updateData,
          reviewedAt: new Date(),
          description: notes ? `${existingTask.description ?? ""}\n\nProcessing notes: ${notes}`.trim() : existingTask.description,
        },
        include: {
          labels: true,
          project: true,
          section: true,
        },
      });

      // Track processing session
      await ctx.db.processingSession.upsert({
        where: {
          id: ctx.session.user.id + "-current",
        },
        update: {
          itemsProcessed: { increment: 1 },
        },
        create: {
          id: ctx.session.user.id + "-current",
          userId: ctx.session.user.id,
          itemsProcessed: 1,
        },
      });

      return updatedTask;
    }),

  // Get tasks by context
  getByContext: protectedProcedure
    .input(z.object({ context: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findMany({
        where: {
          userId: ctx.session.user.id,
          context: input.context,
          completed: false,
        },
        orderBy: [
          { isNextAction: "desc" },
          { priority: "desc" },
          { dueDate: "asc" },
        ],
        include: {
          labels: true,
          project: true,
          section: true,
        },
      });
    }),

  // Unified sync from Todoist (projects, sections, and tasks)
  syncAllFromTodoist: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { todoistApiToken: true },
      });

      const todoistService = createTodoistService(user?.todoistApiToken || undefined);
      if (!todoistService) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize Todoist service",
        });
      }

      let projectsImported = 0;
      let projectsUpdated = 0;
      let sectionsImported = 0;
      let sectionsUpdated = 0;
      let tasksImported = 0;
      let tasksUpdated = 0;

      // Step 1: Sync projects
      const todoistProjects = await todoistService.getProjects();
      for (const todoistProject of todoistProjects) {
        const existingProject = await ctx.db.project.findFirst({
          where: {
            todoistId: todoistProject.id,
            userId: ctx.session.user.id,
          },
        });

        if (existingProject) {
          await ctx.db.project.update({
            where: { id: existingProject.id },
            data: {
              name: todoistProject.name,
              color: todoistProject.color,
              isFavorite: todoistProject.is_favorite,
              isInboxProject: todoistProject.is_inbox_project,
              viewStyle: todoistProject.view_style,
              order: todoistProject.order,
              syncedAt: new Date(),
            },
          });
          projectsUpdated++;
        } else {
          await ctx.db.project.create({
            data: {
              name: todoistProject.name,
              todoistId: todoistProject.id,
              color: todoistProject.color,
              isFavorite: todoistProject.is_favorite,
              isInboxProject: todoistProject.is_inbox_project,
              viewStyle: todoistProject.view_style,
              order: todoistProject.order,
              userId: ctx.session.user.id,
              syncedAt: new Date(),
            },
          });
          projectsImported++;
        }
      }

      // Step 2: Sync sections
      const todoistSections = await todoistService.getSections();
      for (const todoistSection of todoistSections) {
        // Find the local project for this section
        const localProject = await ctx.db.project.findFirst({
          where: {
            todoistId: todoistSection.project_id,
            userId: ctx.session.user.id,
          },
        });

        if (localProject) {
          const existingSection = await ctx.db.section.findFirst({
            where: {
              todoistId: todoistSection.id,
              projectId: localProject.id,
            },
          });

          if (existingSection) {
            await ctx.db.section.update({
              where: { id: existingSection.id },
              data: {
                name: todoistSection.name,
                order: todoistSection.order,
                syncedAt: new Date(),
              },
            });
            sectionsUpdated++;
          } else {
            await ctx.db.section.create({
              data: {
                name: todoistSection.name,
                todoistId: todoistSection.id,
                order: todoistSection.order,
                projectId: localProject.id,
                syncedAt: new Date(),
              },
            });
            sectionsImported++;
          }
        }
      }

      // Step 3: Sync tasks
      const todoistTasks = await todoistService.getTasks();
      const existingTasks = await ctx.db.task.findMany({
        where: {
          userId: ctx.session.user.id,
          todoistId: { not: null },
        },
        include: {
          labels: true,
          project: true,
          section: true,
        },
      });

      const existingTodoistIds = new Set(
        existingTasks.map((t) => t.todoistId).filter(Boolean),
      );

      for (const todoistTask of todoistTasks) {
        // Find project and section if they exist
        let projectId: string | null = null;
        let sectionId: string | null = null;

        if (todoistTask.project_id) {
          const project = await ctx.db.project.findFirst({
            where: {
              todoistId: todoistTask.project_id,
              userId: ctx.session.user.id,
            },
          });
          projectId = project?.id ?? null;
        }

        if (todoistTask.section_id && projectId) {
          const section = await ctx.db.section.findFirst({
            where: {
              todoistId: todoistTask.section_id,
              projectId,
            },
          });
          sectionId = section?.id ?? null;
        }

        if (existingTodoistIds.has(todoistTask.id)) {
          // Update existing task
          const existingTask = existingTasks.find((t) => t.todoistId === todoistTask.id);
          if (existingTask) {
            await ctx.db.task.update({
              where: { id: existingTask.id },
              data: {
                labels: {
                  set: [], // This disconnects all labels
                },
              },
            });

            await ctx.db.task.update({
              where: { id: existingTask.id },
              data: {
                title: todoistTask.content,
                description: todoistTask.description,
                completed: todoistTask.is_completed,
                priority: 5 - todoistTask.priority,
                dueDate: todoistTask.due?.date
                  ? new Date(todoistTask.due.date)
                  : null,
                projectId,
                sectionId,
                syncedAt: new Date(),
                labels: {
                  connectOrCreate: (todoistTask.labels ?? []).map((labelName) => ({
                    where: { name: labelName },
                    create: { name: labelName },
                  })),
                },
              },
            });
            tasksUpdated++;
          }
        } else {
          // Create new task
          await ctx.db.task.create({
            data: {
              title: todoistTask.content,
              description: todoistTask.description,
              completed: todoistTask.is_completed,
              priority: 5 - todoistTask.priority,
              dueDate: todoistTask.due?.date
                ? new Date(todoistTask.due.date)
                : null,
              todoistId: todoistTask.id,
              projectId,
              sectionId,
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
          tasksImported++;
        }
      }

      return {
        projects: { imported: projectsImported, updated: projectsUpdated },
        sections: { imported: sectionsImported, updated: sectionsUpdated },
        tasks: { imported: tasksImported, updated: tasksUpdated },
      };
    } catch (error) {
      console.error("Error in unified sync:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to sync from Todoist",
      });
    }
  }),
});
