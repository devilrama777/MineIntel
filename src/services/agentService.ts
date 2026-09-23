/**
 * MineIntel Agent Service
 *
 * Frontend client for the backend Agent task API.
 *
 * The frontend does not orchestrate ingestion, evidence extraction,
 * intelligence, charts, planning, or report generation directly.
 * The backend Agent owns that orchestration.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";

export type AgentTaskStatus =
  | "PENDING"
  | "RUNNING"
  | "AWAITING_INPUT"
  | "VALIDATING"
  | "RETRYING"
  | "COMPLETED"
  | "FAILED";

export interface CreateAgentTaskRequest {
  goal: string;
  file_ids?: string[];
  context?: Record<string, unknown>;
}

export interface AgentTaskResponse {
  task_id: string;
  status: AgentTaskStatus;
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
  result?: Record<string, unknown> | null;
  error?: string | null;
}

export interface AgentTaskStatusResponse {
  task_id: string;
  status: AgentTaskStatus;
  result?: Record<string, unknown> | null;
  error?: string | null;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";

  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
        ? body.detail
        : typeof body === "string"
          ? body
          : `Agent request failed with HTTP ${response.status}`;

    throw new Error(message);
  }

  return body as T;
}

/**
 * Create a new Agent task.
 */
export async function createAgentTask(
  request: CreateAgentTaskRequest,
): Promise<AgentTaskResponse> {
  const response = await fetch(`${API_BASE_URL}/api/agent/tasks`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  return parseResponse<AgentTaskResponse>(response);
}

/**
 * Fetch complete Agent task details.
 */
export async function getAgentTask(
  taskId: string,
): Promise<AgentTaskResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/agent/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );

  return parseResponse<AgentTaskResponse>(response);
}

/**
 * Fetch lightweight Agent task status.
 */
export async function getAgentTaskStatus(
  taskId: string,
): Promise<AgentTaskStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/agent/tasks/${encodeURIComponent(taskId)}/status`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );

  return parseResponse<AgentTaskStatusResponse>(response);
}
