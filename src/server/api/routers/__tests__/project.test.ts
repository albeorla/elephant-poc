import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "../../trpc";
import { projectRouter } from "../project";
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

describe("projectRouter", () => {
  const createCaller = createCallerFactory(projectRouter);
  let mockContext: ReturnType<typeof createMockContext>;
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    mockContext = createMockContext();
    caller = createCaller(mockContext);
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("should return all projects for the current user", async () => {
      const mockProjects = [
        {
          id: "1",
          name: "Work Project",
          sections: [],
          tasks: [],
          _count: { tasks: 5 },
        },
        {
          id: "2",
          name: "Personal Project",
          sections: [],
          tasks: [],
          _count: { tasks: 2 },
        },
      ];
      mockContext.db.project.findMany.mockResolvedValue(mockProjects);

      const result = await caller.getAll();

      expect(result).toEqual(mockProjects);
      expect(mockContext.db.project.findMany).toHaveBeenCalledWith({
        where: { userId: "test-user-id" },
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
    });
  });

  describe("getById", () => {
    it("should return a project by id", async () => {
      const mockProject = {
        id: "1",
        name: "Work Project",
        userId: "test-user-id",
        sections: [
          {
            id: "s1",
            name: "Section 1",
            tasks: [],
          },
        ],
        tasks: [],
      };
      mockContext.db.project.findFirst.mockResolvedValue(mockProject);

      const result = await caller.getById({ id: "1" });

      expect(result).toEqual(mockProject);
      expect(mockContext.db.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: "1",
          userId: "test-user-id",
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
    });
  });

  describe("create", () => {
    const createInput = {
      name: "New Project",
      color: "blue",
      isFavorite: true,
      syncToTodoist: false,
    };

    it("should create a project without Todoist sync", async () => {
      mockContext.db.project.findFirst.mockResolvedValue({ order: 5 });
      
      const mockCreatedProject = {
        id: "new-project-id",
        name: "New Project",
        color: "blue",
        isFavorite: true,
        order: 6,
        userId: "test-user-id",
        todoistId: null,
        syncedAt: null,
        sections: [],
        _count: { tasks: 0 },
      };
      mockContext.db.project.create.mockResolvedValue(mockCreatedProject);

      const result = await caller.create(createInput);

      expect(result).toEqual(mockCreatedProject);
      expect(mockContext.db.project.create).toHaveBeenCalledWith({
        data: {
          name: "New Project",
          color: "blue",
          isFavorite: true,
          order: 6,
          userId: "test-user-id",
          todoistId: undefined,
          syncedAt: null,
          parentId: undefined,
        },
        include: {
          sections: true,
          _count: {
            select: { tasks: true },
          },
        },
      });
    });

    it("should create a project with Todoist sync", async () => {
      const mockTodoistService = {
        createProject: vi.fn().mockResolvedValue({
          id: "todoist-project-id",
          name: "New Project",
          color: "blue",
        }),
      };
      (createTodoistService as any).mockReturnValue(mockTodoistService);

      mockContext.db.user.findUnique.mockResolvedValue({
        id: "test-user-id",
        todoistApiToken: "test-api-token",
      });

      mockContext.db.project.findFirst.mockResolvedValue({ order: 5 });

      const mockCreatedProject = {
        id: "new-project-id",
        name: "New Project",
        todoistId: "todoist-project-id",
        syncedAt: new Date(),
        sections: [],
        _count: { tasks: 0 },
      };
      mockContext.db.project.create.mockResolvedValue(mockCreatedProject);

      const result = await caller.create({
        ...createInput,
        syncToTodoist: true,
      });

      expect(result).toEqual(mockCreatedProject);
      expect(mockTodoistService.createProject).toHaveBeenCalledWith({
        name: "New Project",
        color: "blue",
        is_favorite: true,
        parent_id: undefined,
      });
    });

    it("should handle Todoist sync failure gracefully", async () => {
      const mockTodoistService = {
        createProject: vi.fn().mockRejectedValue(new Error("API Error")),
      };
      (createTodoistService as any).mockReturnValue(mockTodoistService);

      mockContext.db.user.findUnique.mockResolvedValue({
        id: "test-user-id",
        todoistApiToken: "test-api-token",
      });

      mockContext.db.project.findFirst.mockResolvedValue({ order: 5 });

      const mockCreatedProject = {
        id: "new-project-id",
        name: "New Project",
        todoistId: null,
        syncedAt: null,
        sections: [],
        _count: { tasks: 0 },
      };
      mockContext.db.project.create.mockResolvedValue(mockCreatedProject);

      const result = await caller.create({
        ...createInput,
        syncToTodoist: true,
      });

      expect(result).toEqual(mockCreatedProject);
      // Should still create locally even if Todoist fails
      expect(mockContext.db.project.create).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update a project", async () => {
      mockContext.db.project.findFirst.mockResolvedValue({
        id: "1",
        todoistId: null,
      });

      const mockUpdatedProject = {
        id: "1",
        name: "Updated Project",
        sections: [],
        _count: { tasks: 0 },
      };
      mockContext.db.project.update.mockResolvedValue(mockUpdatedProject);

      const result = await caller.update({
        id: "1",
        name: "Updated Project",
      });

      expect(result).toEqual(mockUpdatedProject);
      expect(mockContext.db.project.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: {
          id: "1",
          name: "Updated Project",
          syncedAt: undefined,
        },
        include: {
          sections: true,
          _count: {
            select: { tasks: true },
          },
        },
      });
    });

    it("should throw error when project not found", async () => {
      mockContext.db.project.findFirst.mockResolvedValue(null);

      await expect(
        caller.update({ id: "999", name: "Updated" }),
      ).rejects.toThrow("Project not found");
    });
  });

  describe("delete", () => {
    it("should delete a project", async () => {
      mockContext.db.project.findFirst.mockResolvedValue({
        id: "1",
        todoistId: null,
      });

      await caller.delete({ id: "1" });

      expect(mockContext.db.project.delete).toHaveBeenCalledWith({
        where: { id: "1" },
      });
    });

    it("should delete a project with Todoist sync", async () => {
      const mockTodoistService = {
        deleteProject: vi.fn().mockResolvedValue(undefined),
      };
      (createTodoistService as any).mockReturnValue(mockTodoistService);

      mockContext.db.user.findUnique.mockResolvedValue({
        id: "test-user-id",
        todoistApiToken: "test-api-token",
      });

      mockContext.db.project.findFirst.mockResolvedValue({
        id: "1",
        todoistId: "todoist-project-id",
      });

      await caller.delete({ id: "1" });

      expect(mockTodoistService.deleteProject).toHaveBeenCalledWith(
        "todoist-project-id",
      );
      expect(mockContext.db.project.delete).toHaveBeenCalledWith({
        where: { id: "1" },
      });
    });
  });

  describe("syncFromTodoist", () => {
    it("should sync projects from Todoist", async () => {
      const mockTodoistService = {
        getProjects: vi.fn().mockResolvedValue([
          {
            id: "todoist-1",
            name: "Todoist Project 1",
            color: "red",
            is_favorite: false,
            is_inbox_project: false,
            view_style: "list",
            order: 1,
          },
          {
            id: "todoist-2", 
            name: "Todoist Project 2",
            color: "blue",
            is_favorite: true,
            is_inbox_project: false,
            view_style: "list",
            order: 2,
          },
        ]),
      };
      (createTodoistService as any).mockReturnValue(mockTodoistService);

      mockContext.db.user.findUnique.mockResolvedValue({
        id: "test-user-id",
        todoistApiToken: "test-api-token",
      });

      // Mock existing project
      mockContext.db.project.findFirst
        .mockResolvedValueOnce({ id: "existing-1" })
        .mockResolvedValueOnce(null);

      const result = await caller.syncFromTodoist();

      expect(result).toEqual({ imported: 1, updated: 1 });
      expect(mockContext.db.project.update).toHaveBeenCalledTimes(1);
      expect(mockContext.db.project.create).toHaveBeenCalledTimes(1);
    });

    it("should throw error when no API token", async () => {
      (createTodoistService as any).mockReturnValue(null);
      
      mockContext.db.user.findUnique.mockResolvedValue({
        id: "test-user-id",
        todoistApiToken: null,
      });

      await expect(caller.syncFromTodoist()).rejects.toThrow(
        "Todoist API token not configured",
      );
    });
  });
});