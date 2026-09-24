import { getApiBaseUrl } from './config';
import { authService } from './authService';

const API_BASE = getApiBaseUrl();

export interface AgentJobRequest {
  job_id?: string;
  task_id?: string;
  instruction?: string;
}

export interface AgentJobResponse {
  success: boolean;
  job_id?: string;
  task_id?: string;
  status: string;
  message?: string;
}

export interface AgentJobStatusResponse {
  success: boolean;
  job_id?: string;
  task_id?: string;
  status: string;
  task?: any;
  job?: any;
}

export interface AgentJobListResponse {
  success: boolean;
  jobs: any[];
}

class AgentService {
  private getHeaders(): HeadersInit {
    const token = authService.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public async createAgentTask(request: AgentJobRequest): Promise<AgentJobResponse> {
    const payload = {
      task_id: request.task_id || request.job_id,
      instruction: request.instruction,
    };

    const response = await fetch(`${API_BASE}/api/agent/tasks`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Failed to create agent task (${response.status}): ${errText || response.statusText}`);
    }

    return response.json();
  }

  public async startAgentJob(request: AgentJobRequest): Promise<AgentJobResponse> {
    return this.createAgentTask(request);
  }

  public async getAgentTaskStatus(taskId: string): Promise<AgentJobStatusResponse> {
    const response = await fetch(`${API_BASE}/api/agent/tasks/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Failed to fetch agent task status (${response.status}): ${errText || response.statusText}`);
    }

    return response.json();
  }

  public async getAgentTask(taskId: string): Promise<AgentJobStatusResponse> {
    return this.getAgentTaskStatus(taskId);
  }

  public async getAgentJobStatus(jobId: string): Promise<AgentJobStatusResponse> {
    return this.getAgentTaskStatus(jobId);
  }

  public async getAgentJobs(): Promise<AgentJobListResponse> {
    const response = await fetch(`${API_BASE}/api/agent/tasks`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Failed to fetch agent jobs (${response.status}): ${errText || response.statusText}`);
    }

    return response.json();
  }
}

export const agentService = new AgentService();

