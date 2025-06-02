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
}

export interface TodoistCreateTask {
  content: string;
  description?: string;
  priority?: number;
  due_date?: string;
  labels?: string[];
}

export interface TodoistUpdateTask {
  content?: string;
  description?: string;
  priority?: number;
  due_date?: string;
  labels?: string[];
  is_completed?: boolean;
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
    body?: unknown
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
}

export function createTodoistService(apiKey?: string): TodoistService | null {
  const key = apiKey ?? env.TODOIST_API_KEY;
  if (!key) return null;
  return new TodoistService(key);
} 