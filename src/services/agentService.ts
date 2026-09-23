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
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '';

export type AgentTaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'AWAITING_INPUT'
  | 'VALIDATING'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED';

export interface CreateAgentTaskRequest {
  job_id: string;
  instruction?: string;
}

export interface CreateAgentTaskResponse {
  success: boolean;
  task_id: string;
  status: AgentTaskStatus;
  message?: string;
}

export interface AgentTaskStatusResponse {
  success: boolean;
  task_id: string;
  status: AgentTaskStatus;
  structured_state?: Record<string, unknown>;
}

export interface AgentTaskDetailsResponse {
  success: boolean;
  task: Record<string, unknown>;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';

  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'detail' in body &&
      typeof body.detail === 'string'
        ? body.detail
        : typeof body === 'string'
          ? body
          : `Agent request failed with HTTP ${response.status}`;

    throw new Error(message);
  }

  return body as T;
}

export async function createAgentTask(
  request: CreateAgentTaskRequest,
): Promise<CreateAgentTaskResponse> {
  const response = await fetch(`${API_BASE_URL}/api/agent/tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  return parseResponse<CreateAgentTaskResponse>(response);
}

export async function getAgentTaskStatus(
  taskId: string,
): Promise<AgentTaskStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/agent/tasks/${encodeURIComponent(taskId)}/status`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    },
  );

  return parseResponse<AgentTaskStatusResponse>(response);
}

export async function getAgentTask(
  taskId: string,
): Promise<AgentTaskDetailsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/agent/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    },
  );

  return parseResponse<AgentTaskDetailsResponse>(response);
}
