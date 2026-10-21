// ============================================================================
// AquaVision AI — API Client
// ============================================================================

import type { ApiError, BackendCapabilities } from '@/types';

export class ApiClient {
  private baseUrl: string;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    requestId?: string
  ): Promise<T> {
    const controller = new AbortController();
    if (requestId) {
      this.abortControllers.get(requestId)?.abort();
      this.abortControllers.set(requestId, controller);
    }

    const url = `${this.baseUrl}${path}`;
    const defaultHeaders: Record<string, string> = {};

    // Don't set Content-Type for FormData — let browser add boundary
    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers },
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorBody: ApiError;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = {
            code: 'UNKNOWN_ERROR',
            message: `Request failed with status ${response.status}`,
            statusCode: response.status,
          };
        }
        throw errorBody;
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json();
      }
      return response.blob() as unknown as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw { code: 'CANCELLED', message: 'Request was cancelled' } as ApiError;
      }
      if ((error as ApiError).code) {
        throw error;
      }
      throw {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the backend. Please check the connection.',
      } as ApiError;
    } finally {
      if (requestId) {
        this.abortControllers.delete(requestId);
      }
    }
  }

  cancelRequest(requestId: string) {
    this.abortControllers.get(requestId)?.abort();
    this.abortControllers.delete(requestId);
  }

  // --- Health & Capabilities ---
  async checkHealth(): Promise<{ status: string }> {
    return this.request('/health');
  }

  async getCapabilities(): Promise<BackendCapabilities> {
    return this.request('/capabilities');
  }

  // --- Enhancement ---
  async enhanceImage(formData: FormData, requestId?: string) {
    return this.request('/analysis/enhance', {
      method: 'POST',
      body: formData,
    }, requestId);
  }

  // --- Detection ---
  async detectObjects(formData: FormData, requestId?: string) {
    return this.request('/analysis/detect', {
      method: 'POST',
      body: formData,
    }, requestId);
  }

  // --- Pipeline ---
  async runPipeline(formData: FormData, requestId?: string) {
    return this.request('/analysis/pipeline', {
      method: 'POST',
      body: formData,
    }, requestId);
  }

  // --- Video ---
  async processVideo(formData: FormData, requestId?: string) {
    return this.request('/analysis/video', {
      method: 'POST',
      body: formData,
    }, requestId);
  }

  // --- History ---
  async getAnalysisList() {
    return this.request('/analysis');
  }

  async getAnalysis(id: string) {
    return this.request(`/analysis/${id}`);
  }

  async getAnalysisResults(id: string) {
    return this.request(`/analysis/${id}/results`);
  }
}

export const apiClient = new ApiClient();
