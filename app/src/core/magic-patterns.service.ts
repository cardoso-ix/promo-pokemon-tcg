/**
 * Serviço de Integração Magic Patterns AI (Frontend & Design Systems)
 * Fornece interface programática para prototipagem de UI, extração de código e design systems.
 */

const API_BASE = 'https://api.magicpatterns.com/mcp';
const DEFAULT_API_KEY = process.env.MAGIC_PATTERNS_API_KEY || 'mp_live_C9awTZmDZZhACyvhCVBxN';

export interface MagicPatternsDesignResponse {
  editorId: string;
  editorUrl: string;
  previewUrl: string;
  activeArtifactId: string | null;
  availableFiles: string[];
}

export interface MagicPatternsStatusResponse {
  isGenerating: boolean;
  activeArtifactId?: string;
  previewUrl?: string;
  availableFiles?: string[];
  error?: string;
}

export interface MagicPatternsFileItem {
  name: string;
  content: string;
}

export class MagicPatternsService {
  private apiKey: string;
  private agentName: string;

  constructor(apiKey?: string, agentName: string = 'antigravity') {
    this.apiKey = apiKey || DEFAULT_API_KEY;
    this.agentName = agentName;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'x-mp-api-key': this.apiKey,
      'x-mp-agent-name': this.agentName
    };
  }

  /**
   * Cria um novo design/protótipo de interface visual a partir de um prompt
   */
  async createDesign(prompt: string, designSystemId?: string): Promise<MagicPatternsDesignResponse> {
    const payload: { prompt: string; designSystemId?: string } = { prompt };
    if (designSystemId) {
      payload.designSystemId = designSystemId;
    }

    const res = await fetch(`${API_BASE}/design/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`[Magic Patterns] Erro ao criar design: ${res.status} ${res.statusText} - ${errText}`);
    }

    return (await res.json()) as MagicPatternsDesignResponse;
  }

  /**
   * Consulta o status de geração e artefato ativo de um design
   */
  async getDesignStatus(editorId: string): Promise<MagicPatternsStatusResponse> {
    const res = await fetch(`${API_BASE}/design/status`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ editorId })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`[Magic Patterns] Erro ao consultar status: ${res.status} - ${errText}`);
    }

    return (await res.json()) as MagicPatternsStatusResponse;
  }

  /**
   * Itera e envia refinamentos para um design existente
   */
  async sendPrompt(editorId: string, prompt: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/design/prompt`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ editorId, prompt })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`[Magic Patterns] Erro ao enviar prompt: ${res.status} - ${errText}`);
    }

    return { success: true };
  }

  /**
   * Recupera arquivos de código gerados pelo Magic Patterns (React, CSS, TSX)
   */
  async readArtifactFiles(artifactId: string, fileNames?: string[]): Promise<MagicPatternsFileItem[]> {
    const res = await fetch(`${API_BASE}/artifact/files`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ artifactId, fileNames })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`[Magic Patterns] Erro ao ler arquivos do artefato: ${res.status} - ${errText}`);
    }

    const json = (await res.json()) as { files: MagicPatternsFileItem[] };
    return json.files || [];
  }
}

export const magicPatternsService = new MagicPatternsService();
