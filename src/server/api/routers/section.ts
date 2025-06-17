import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createTodoistService } from "~/server/services/todoist";

export const sectionRouter = createTRPCRouter({
  // Get all sections for a project
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify project belongs to user
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.session.user.id,
        },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      return ctx.db.section.findMany({
        where: { projectId: input.projectId },
        include: {
          tasks: {
            include: { labels: true },
            orderBy: { order: "asc" },
          },
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: { order: "asc" },
      });
    }),

  // Create a new section
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Section name is required"),
        projectId: z.string(),
        syncToTodoist: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify project belongs to user
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
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
      let todoistId: string | undefined;

      // Create in Todoist if sync is enabled and project is synced
      if (input.syncToTodoist && project.todoistId && todoistService) {
        try {
          const todoistSection = await todoistService.createSection({
            name: input.name,
            project_id: project.todoistId,
          });
          todoistId = todoistSection.id;
        } catch (error) {
          console.error("Failed to create section in Todoist:", error);
          // Continue with local creation even if Todoist fails
        }
      }

      // Get the highest order for sections in this project
      const lastSection = await ctx.db.section.findFirst({
        where: { projectId: input.projectId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const order = (lastSection?.order ?? 0) + 1;

      return ctx.db.section.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          order,
          todoistId,
          syncedAt: todoistId ? new Date() : null,
        },
        include: {
          tasks: {
            include: { labels: true },
            orderBy: { order: "asc" },
          },
          _count: {
            select: { tasks: true },
          },
        },
      });
    }),

  // Update a section
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        order: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const section = await ctx.db.section.findFirst({
        where: { id: input.id },
        include: {
          project: {
            select: { todoistId: true, userId: true },
          },
        },
      });

      if (!section?.project || section.project.userId !== ctx.session.user.id) {
        throw new Error("Section not found");
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { todoistApiToken: true },
      });

      const todoistService = createTodoistService(user?.todoistApiToken || undefined);

      // Update in Todoist if synced
      if (section.todoistId && todoistService) {
        try {
          await todoistService.updateSection(section.todoistId, {
            name: input.name,
            order: input.order,
          });
        } catch (error) {
          console.error("Failed to update section in Todoist:", error);
          // Continue with local update even if Todoist fails
        }
      }

      return ctx.db.section.update({
        where: { id: input.id },
        data: {
          ...input,
          syncedAt: section.todoistId ? new Date() : undefined,
        },
        include: {
          tasks: {
            include: { labels: true },
            orderBy: { order: "asc" },
          },
          _count: {
            select: { tasks: true },
          },
        },
      });
    }),

  // Delete a section
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const section = await ctx.db.section.findFirst({
        where: { id: input.id },
        include: {
          project: {
            select: { todoistId: true, userId: true },
          },
        },
      });

      if (!section?.project || section.project.userId !== ctx.session.user.id) {
        throw new Error("Section not found");
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { todoistApiToken: true },
      });

      const todoistService = createTodoistService(user?.todoistApiToken || undefined);

      // Delete from Todoist if synced
      if (section.todoistId && todoistService) {
        try {
          await todoistService.deleteSection(section.todoistId);
        } catch (error) {
          console.error("Failed to delete section from Todoist:", error);
          // Continue with local deletion even if Todoist fails
        }
      }

      await ctx.db.section.delete({
        where: { id: input.id },
      });
    }),
});