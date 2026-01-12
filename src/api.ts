import * as vscode from 'vscode';

interface Project {
  id: number;
  documentId: string;
  title: string;
  client?: {
    name: string;
  };
}

interface TimeEntryData {
  start_time: string;
  end_time: string;
  duration: number;
  description: string;
  project: number;
  billable: boolean;
}

interface ApiResponse<T> {
  data: T;
  error?: {
    message: string;
  };
}

export class EclipseApi {
  private getConfig() {
    return vscode.workspace.getConfiguration('eclipseTracker');
  }

  private get apiUrl(): string {
    return this.getConfig().get<string>('apiUrl') || 'https://api.dashboard.eclipsestudiodev.fr/api';
  }

  private get apiToken(): string {
    return this.getConfig().get<string>('apiToken') || '';
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    if (!this.apiToken) {
      console.error('Eclipse Tracker: No API token configured');
      return null;
    }

    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Eclipse API Error:', error);
        return null;
      }

      return response.json();
    } catch (error) {
      console.error('Eclipse API Request failed:', error);
      return null;
    }
  }

  async validateToken(): Promise<boolean> {
    const result = await this.fetch<ApiResponse<{ valid: boolean; user_id: number }>>('/api-tokens/validate');
    return result?.data?.valid === true;
  }

  async getProjects(): Promise<Project[]> {
    const result = await this.fetch<ApiResponse<Project[]>>('/projects?populate=client&sort=updatedAt:desc&pagination[pageSize]=100');
    return result?.data || [];
  }

  async createTimeEntry(data: TimeEntryData): Promise<boolean> {
    const result = await this.fetch<ApiResponse<unknown>>('/time-entries', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          ...data,
          project: { connect: [{ id: data.project }] },
        },
      }),
    });
    return result !== null;
  }

  async getUserId(): Promise<number | null> {
    const result = await this.fetch<ApiResponse<{ valid: boolean; user_id: number }>>('/api-tokens/validate');
    return result?.data?.user_id || null;
  }
}

