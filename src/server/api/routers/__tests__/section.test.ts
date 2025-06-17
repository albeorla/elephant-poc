import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "../../trpc";
import { sectionRouter } from "../section";
import { createTodoistService } from "../../../services/todoist";
import type { PrismaClient } from "@prisma/client";

// Mock auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
  getServerAuthSession: vi.fn(),
}));

// Mock Todoist service
vi.mock("../../../services/todoist", () => ({
  createTodoistService: vi.fn(),
}));

// Create a mock context
const createMockContext = (overrides?: any) => ({
  session: {
    user: {
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
    },
  },
  db: {
    project: {
      findFirst: vi.fn(),
    },
    section: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  } as unknown as PrismaClient,
  ...overrides,
});

describe("sectionRouter", () => {
  const createCaller = createCallerFactory(sectionRouter);
  let mockContext: ReturnType<typeof createMockContext>;
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    mockContext = createMockContext();
    caller = createCaller(mockContext);
    vi.clearAllMocks();
  });

  describe("getByProject", () => {
    it("should return all sections for a project", async () => {
      // Mock project verification
      mockContext.db.project.findFirst.mockResolvedValue({
        id: "project-1",
        userId: "test-user-id",
      });

      const mockSections = [
        {
          id: "1",
          name: "To Do",
          projectId: "project-1",
          tasks: [],
          _count: { tasks: 3 },
        },
        {
          id: "2",
          name: "In Progress",
          projectId: "project-1",
          tasks: [],
          _count: { tasks: 1 },
        },
      ];
      mockContext.db.section.findMany.mockResolvedValue(mockSections);

      const result = await caller.getByProject({ projectId: "project-1" });

      expect(result).toEqual(mockSections);
      expect(mockContext.db.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: "project-1",
          userId: "test-user-id",
        },
      });
      expect(mockContext.db.section.findMany).toHaveBeenCalledWith({
        where: { projectId: "project-1" },
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
    });

    it("should throw error when project not found", async () => {
      mockContext.db.project.findFirst.mockResolvedValue(null);

      await expect(
        caller.getByProject({ projectId: "invalid-project" }),
      ).rejects.toThrow("Project not found");
    });
  });

  describe("create", () => {
    const createInput = {
      name: "New Section",
      projectId: "project-1",
      syncToTodoist: false,
    };

    it("should create a section without Todoist sync", async () => {
      // Mock project verification
      mockContext.db.project.findFirst.mockResolvedValue({
        id: "project-1",
        userId: "test-user-id",
        todoistId: null,
      });

      // Mock last section order
      mockContext.db.section.findFirst.mockResolvedValue({ order: 3 });

      const mockCreatedSection = {
        id: "new-section-id",
        name: "New Section",
        projectId: "project-1",
        order: 4,
        todoistId: null,
        syncedAt: null,
        tasks: [],
        _count: { tasks: 0 },
      };
      mockContext.db.section.create.mockResolvedValue(mockCreatedSection);

      const result = await caller.create(createInput);

      expect(result).toEqual(mockCreatedSection);
      expect(mockContext.db.section.create).toHaveBeenCalledWith({
        data: {
          name: "New Section",
          projectId: "project-1",
          order: 4,
          todoistId: undefined,
          syncedAt: null,
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
    });

    it("should create a section with Todoist sync", async () => {
      const mockTodoistService = {
        createSection: vi.fn().mockResolvedValue({
          id: "todoist-section-id",
          name: "New Section",
        }),
      };
      (createTodoistService as any).mockReturnValue(mockTodoistService);

      // Mock project verification with Todoist ID
      mockContext.db.project.findFirst.mockResolvedValue({
        id: "project-1",
        userId: "test-user-id",
        todoistId: "todoist-project-id",
      });

      mockContext.db.user.findUnique.mockResolvedValue({
        id: "test-user-id",
        todoistApiToken: "test-api-token",
      });

      mockContext.db.section.findFirst.mockResolvedValue({ order: 3 });

      const mockCreatedSection = {
        id: "new-section-id",
        name: "New Section",
        todoistId: "todoist-section-id",
        syncedAt: new Date(),
        tasks: [],
        _count: { tasks: 0 },
      };
      mockContext.db.section.create.mockResolvedValue(mockCreatedSection);

      const result = await caller.create({
        ...createInput,
        syncToTodoist: true,
      });

      expect(result).toEqual(mockCreatedSection);
      expect(mockTodoistService.createSection).toHaveBeenCalledWith({
        name: "New Section",
        project_id: "todoist-project-id",
      });
    });

    it("should handle Todoist sync failure gracefully", async () => {
      const mockTodoistService = {
        createSection: vi.fn().mockRejectedValue(new Error("API Error")),
      };
      (createTodoistService as any).mockReturnValue(mockTodoistService);

      mockContext.db.project.findFirst.mockResolvedValue({
        id: "project-1",
        userId: "test-user-id",
        todoistId: "todoist-project-id",
      });

      mockContext.db.user.findUnique.mockResolvedValue({
        id: "test-user-id",
        todoistApiToken: "test-api-token",
      });

      mockContext.db.section.findFirst.mockResolvedValue({ order: 3 });

      const mockCreatedSection = {
        id: "new-section-id",
        name: "New Section",
        todoistId: null,
        syncedAt: null,
        tasks: [],
        _count: { tasks: 0 },
      };
      mockContext.db.section.create.mockResolvedValue(mockCreatedSection);

      const result = await caller.create({
        ...createInput,
        syncToTodoist: true,
      });

      expect(result).toEqual(mockCreatedSection);
      // Should still create locally even if Todoist fails
      expect(mockContext.db.section.create).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update a section", async () => {
      mockContext.db.section.findFirst.mockResolvedValue({
        id: "1",
        todoistId: null,
        project: {
          todoistId: null,
        },
      });

      const mockUpdatedSection = {
        id: "1",
        name: "Updated Section",
        tasks: [],
        _count: { tasks: 0 },
      };
      mockContext.db.section.update.mockResolvedValue(mockUpdatedSection);

      const result = await caller.update({
        id: "1",
        name: "Updated Section",
      });

      expect(result).toEqual(mockUpdatedSection);
      expect(mockContext.db.section.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: {
          id: "1",
          name: "Updated Section",
          syncedAt: undefined,
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
    });

    it("should throw error when section not found", async () => {
      mockContext.db.section.findFirst.mockResolvedValue(null);

      await expect(
        caller.update({ id: "999", name: "Updated" }),
      ).rejects.toThrow("Section not found");
    });
  });

  describe("delete", () => {
    it("should delete a section", async () => {
      mockContext.db.section.findFirst.mockResolvedValue({
        id: "1",
        todoistId: null,
        project: {
          todoistId: null,
        },
      });

      await caller.delete({ id: "1" });

      expect(mockContext.db.section.delete).toHaveBeenCalledWith({
        where: { id: "1" },
      });
    });

    it("should delete a section with Todoist sync", async () => {
      const mockTodoistService = {
        deleteSection: vi.fn().mockResolvedValue(undefined),
      };
      (createTodoistService as any).mockReturnValue(mockTodoistService);

      mockContext.db.user.findUnique.mockResolvedValue({
        id: "test-user-id",
        todoistApiToken: "test-api-token",
      });

      mockContext.db.section.findFirst.mockResolvedValue({
        id: "1",
        todoistId: "todoist-section-id",
        project: {
          todoistId: "todoist-project-id",
        },
      });

      await caller.delete({ id: "1" });

      expect(mockTodoistService.deleteSection).toHaveBeenCalledWith(
        "todoist-section-id",
      );
      expect(mockContext.db.section.delete).toHaveBeenCalledWith({
        where: { id: "1" },
      });
    });
  });
});