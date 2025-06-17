import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createTodoistService } from "~/server/services/todoist";

export const projectRouter = createTRPCRouter({
  // Get all projects for the user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
        tasks: {
          where: { sectionId: null },
          orderBy: { order: "asc" },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { order: "asc" },
    });
  }),

  // Get a single project
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          sections: {
            include: {
              tasks: {
                include: { labels: true },
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
          tasks: {
            where: { sectionId: null },
            include: { labels: true },
            orderBy: { order: "asc" },
          },
        },
      });
    }),

  // Create a new project
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Project name is required"),
        color: z.string().optional(),
        isFavorite: z.boolean().default(false),
        syncToTodoist: z.boolean().default(false),
        parentId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { todoistApiToken: true },
      });

      const todoistService = createTodoistService(user?.todoistApiToken || undefined);
      let todoistId: string | undefined;

      // Create in Todoist if sync is enabled and user has token
      if (input.syncToTodoist && todoistService) {
        try {
          const todoistProject = await todoistService.createProject({
            name: input.name,
            color: input.color,
            is_favorite: input.isFavorite,
            parent_id: input.parentId,
          });
          todoistId = todoistProject.id;
        } catch (error) {
          console.error("Failed to create project in Todoist:", error);
          // Continue with local creation even if Todoist fails
        }
      }

      // Get the highest order for projects
      const lastProject = await ctx.db.project.findFirst({
        where: { userId: ctx.session.user.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const order = (lastProject?.order ?? 0) + 1;

      return ctx.db.project.create({
        data: {
          name: input.name,
          color: input.color,
          isFavorite: input.isFavorite,
          order,
          userId: ctx.session.user.id,
          todoistId,
          syncedAt: todoistId ? new Date() : null,
          parentId: input.parentId,
        },
        include: {
          sections: true,
          _count: {
            select: { tasks: true },
          },
        },
      });
    }),

  // Update a project
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        color: z.string().optional(),
        isFavorite: z.boolean().optional(),
        order: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        select: { todoistId: true },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { todoistApiToken: true },
      });

      const todoistService = createTodoistService(user?.todoistApiToken || undefined);

      // Update in Todoist if synced
      if (project.todoistId && todoistService) {
        try {
          await todoistService.updateProject(project.todoistId, {
            name: input.name,
            color: input.color,
            is_favorite: input.isFavorite,
            order: input.order,
          });
        } catch (error) {
          console.error("Failed to update project in Todoist:", error);
          // Continue with local update even if Todoist fails
        }
      }

      return ctx.db.project.update({
        where: { id: input.id },
        data: {
          ...input,
          syncedAt: project.todoistId ? new Date() : undefined,
        },
        include: {
          sections: true,
          _count: {
            select: { tasks: true },
          },
        },
      });
    }),

  // Delete a project
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        select: { todoistId: true },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { todoistApiToken: true },
      });

      const todoistService = createTodoistService(user?.todoistApiToken || undefined);

      // Delete from Todoist if synced
      if (project.todoistId && todoistService) {
        try {
          await todoistService.deleteProject(project.todoistId);
        } catch (error) {
          console.error("Failed to delete project from Todoist:", error);
          // Continue with local deletion even if Todoist fails
        }
      }

      await ctx.db.project.delete({
        where: { id: input.id },
      });
    }),

  // Sync projects from Todoist
  syncFromTodoist: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { todoistApiToken: true },
    });

    const todoistService = createTodoistService(user?.todoistApiToken || undefined);
    if (!todoistService) {
      throw new Error("Todoist API token not configured");
    }

    const todoistProjects = await todoistService.getProjects();
    let imported = 0;
    let updated = 0;

    for (const todoistProject of todoistProjects) {
      const existingProject = await ctx.db.project.findFirst({
        where: {
          todoistId: todoistProject.id,
          userId: ctx.session.user.id,
        },
      });

      if (existingProject) {
        // Update existing project
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
        updated++;
      } else {
        // Create new project
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
        imported++;
      }
    }

    return { imported, updated };
  }),
});