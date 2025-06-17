import { env } from "~/env";

export interface TodoistTask {
  id: string;
  content: string;
  description?: string;
  priority: number;
  due?: {
    date: string;
    datetime?: string;
    string: string;
    timezone?: string;
  };
  labels?: string[];
  is_completed: boolean;
  created_at: string;
  project_id?: string;
  section_id?: string;
  order?: number;
  url?: string;
}

export interface TodoistProject {
  id: string;
  name: string;
  comment_count: number;
  order: number;
  color: string;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  view_style: string;
  url: string;
  parent_id?: string;
}

export interface TodoistSection {
  id: string;
  project_id: string;
  order: number;
  name: string;
}

export interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number;
  is_favorite: boolean;
}

export interface TodoistCreateTask {
  content: string;
  description?: string;
  priority?: number;
  due_date?: string;
  due_datetime?: string;
  due_string?: string;
  labels?: string[];
  project_id?: string;
  section_id?: string;
  order?: number;
}

export interface TodoistUpdateTask {
  content?: string;
  description?: string;
  priority?: number;
  due_date?: string;
  due_datetime?: string;
  due_string?: string;
  labels?: string[];
}

export interface TodoistCreateProject {
  name: string;
  parent_id?: string;
  order?: number;
  color?: string;
  is_favorite?: boolean;
  view_style?: string;
}

export interface TodoistUpdateProject {
  name?: string;
  order?: number;
  color?: string;
  is_favorite?: boolean;
  view_style?: string;
}

export interface TodoistCreateSection {
  name: string;
  project_id: string;
  order?: number;
}

export interface TodoistUpdateSection {
  name?: string;
  order?: number;
}

export class TodoistService {
  private apiKey: string;
  private baseUrl = "https://api.todoist.com/rest/v2";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Todoist API error: ${response.statusText}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async getTasks(): Promise<TodoistTask[]> {
    return this.request<TodoistTask[]>("GET", "/tasks");
  }

  async getTask(id: string): Promise<TodoistTask> {
    return this.request<TodoistTask>("GET", `/tasks/${id}`);
  }

  async createTask(task: TodoistCreateTask): Promise<TodoistTask> {
    return this.request<TodoistTask>("POST", "/tasks", task);
  }

  async updateTask(id: string, task: TodoistUpdateTask): Promise<TodoistTask> {
    return this.request<TodoistTask>("POST", `/tasks/${id}`, task);
  }

  async deleteTask(id: string): Promise<void> {
    await this.request<void>("DELETE", `/tasks/${id}`);
  }

  async closeTask(id: string): Promise<void> {
    await this.request<void>("POST", `/tasks/${id}/close`);
  }

  async reopenTask(id: string): Promise<void> {
    await this.request<void>("POST", `/tasks/${id}/reopen`);
  }

  // Projects
  async getProjects(): Promise<TodoistProject[]> {
    return this.request<TodoistProject[]>("GET", "/projects");
  }

  async getProject(id: string): Promise<TodoistProject> {
    return this.request<TodoistProject>("GET", `/projects/${id}`);
  }

  async createProject(project: TodoistCreateProject): Promise<TodoistProject> {
    return this.request<TodoistProject>("POST", "/projects", project);
  }

  async updateProject(id: string, project: TodoistUpdateProject): Promise<TodoistProject> {
    return this.request<TodoistProject>("POST", `/projects/${id}`, project);
  }

  async deleteProject(id: string): Promise<void> {
    await this.request<void>("DELETE", `/projects/${id}`);
  }

  // Sections
  async getSections(projectId?: string): Promise<TodoistSection[]> {
    const endpoint = projectId ? `/sections?project_id=${projectId}` : "/sections";
    return this.request<TodoistSection[]>("GET", endpoint);
  }

  async getSection(id: string): Promise<TodoistSection> {
    return this.request<TodoistSection>("GET", `/sections/${id}`);
  }

  async createSection(section: TodoistCreateSection): Promise<TodoistSection> {
    return this.request<TodoistSection>("POST", "/sections", section);
  }

  async updateSection(id: string, section: TodoistUpdateSection): Promise<TodoistSection> {
    return this.request<TodoistSection>("POST", `/sections/${id}`, section);
  }

  async deleteSection(id: string): Promise<void> {
    await this.request<void>("DELETE", `/sections/${id}`);
  }

  // Labels
  async getLabels(): Promise<TodoistLabel[]> {
    return this.request<TodoistLabel[]>("GET", "/labels");
  }

  async getLabel(id: string): Promise<TodoistLabel> {
    return this.request<TodoistLabel>("GET", `/labels/${id}`);
  }
}

export function createTodoistService(apiKey?: string): TodoistService | null {
  const key = apiKey ?? env.TODOIST_API_KEY;
  if (!key) return null;
  return new TodoistService(key);
}
