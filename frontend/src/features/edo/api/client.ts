import api from "@/api/client";
import type {
  Template,
  TemplateListItem,
  TemplateVersion,
  ShareLink,
  ParsedDocument,
  ShareInfo,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  RenderPayload,
  CreateShareLinkPayload,
  DocumentProject,
  DocumentProjectListItem,
  CreateDocumentProjectPayload,
  UpdateDocumentProjectPayload,
} from "./types";

export const templatesApi = {
  list: async (
    scope: "public" | "my" | "shared" | "all" = "all"
  ): Promise<TemplateListItem[]> => {
    const response = await api.get<any>("/edo/templates/templates/", {
      params: { scope },
    });
    return response.data.results || response.data;
  },

  get: async (id: number): Promise<Template> => {
    const response = await api.get<Template>(`/edo/templates/templates/${id}/`);
    return response.data;
  },

  create: async (data: CreateTemplatePayload): Promise<Template> => {
    const response = await api.post<Template>("/edo/templates/templates/", data);
    return response.data;
  },

  update: async (
    id: number,
    data: UpdateTemplatePayload
  ): Promise<Template> => {
    const response = await api.patch<Template>(`/edo/templates/templates/${id}/`, data);
    return response.data;
  },

  uploadDocx: async (id: number, file: File): Promise<Template> => {
    const formData = new FormData();
    formData.append("docx_file", file);
    const response = await api.patch<Template>(`/edo/templates/templates/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/edo/templates/templates/${id}/`);
  },

  getVersions: async (id: number): Promise<TemplateVersion[]> => {
    const response = await api.get<any>(
      `/edo/templates/templates/${id}/versions/`
    );
    return response.data.results || response.data;
  },

  restoreVersion: async (
    templateId: number,
    versionId: number
  ): Promise<Template> => {
    const response = await api.post<Template>(
      `/edo/templates/templates/${templateId}/versions/restore/${versionId}/`
    );
    return response.data;
  },

  createShareLink: async (
    id: number,
    data: CreateShareLinkPayload = {}
  ): Promise<ShareLink> => {
    const response = await api.post<ShareLink>(
      `/edo/templates/templates/${id}/share-links/`,
      data
    );
    return response.data;
  },

  render: async (id: number, data: RenderPayload): Promise<Blob> => {
    const response = await api.post(`/edo/templates/templates/${id}/render/`, data, {
      responseType: "blob",
    });
    return response.data;
  },

  downloadSource: async (
    id: number,
    format: "pdf" | "html" | "docx" | "json"
  ) => {
    // ?fmt=..., не ?format=... — иначе DRF content-negotiation перехватит и вернёт 404.
    const response = await api.get(
      `/edo/templates/templates/${id}/download-source/?fmt=${format}`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },
};

export const shareApi = {
  getInfo: async (token: string): Promise<ShareInfo> => {
    const response = await api.get<ShareInfo>(`/edo/templates/share/${token}/`);
    return response.data;
  },

  render: async (token: string, data: RenderPayload): Promise<Blob> => {
    const response = await api.post(`/edo/templates/share/${token}/render/`, data, {
      responseType: "blob",
    });
    return response.data;
  },
};

export const parserApi = {
  parse: async (file: File): Promise<ParsedDocument> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<ParsedDocument>("/edo/parser/parse/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  get: async (id: number): Promise<ParsedDocument> => {
    const response = await api.get<ParsedDocument>(`/edo/parser/parse/${id}/`);
    return response.data;
  },
};

export const docBuilderApi = {
  list: async (): Promise<DocumentProjectListItem[]> => {
    const response = await api.get<any>(
      "/edo/doc-builder/projects/"
    );
    return response.data.results || response.data;
  },

  get: async (id: number): Promise<DocumentProject> => {
    const response = await api.get<DocumentProject>(
      `/edo/doc-builder/projects/${id}/`
    );
    return response.data;
  },

  create: async (
    data: CreateDocumentProjectPayload
  ): Promise<DocumentProject> => {
    const response = await api.post<DocumentProject>(
      "/edo/doc-builder/projects/",
      data
    );
    return response.data;
  },

  update: async (
    id: number,
    data: UpdateDocumentProjectPayload
  ): Promise<DocumentProject> => {
    const response = await api.patch<DocumentProject>(
      `/edo/doc-builder/projects/${id}/`,
      data
    );
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/edo/doc-builder/projects/${id}/`);
  },

  exportJson: async (id: number): Promise<Blob> => {
    const response = await api.get(`/edo/doc-builder/projects/${id}/export/json/`, {
      responseType: "blob",
    });
    return response.data;
  },

  importJson: async (file: File): Promise<DocumentProject> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<DocumentProject>(
      "/edo/doc-builder/import/json/",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  },

  exportDocx: async (id: number): Promise<Blob> => {
    const response = await api.post(
      `/edo/doc-builder/projects/${id}/export/docx/`,
      {},
      {
        responseType: "blob",
      }
    );
    return response.data;
  },

  exportPdf: async (id: number): Promise<Blob> => {
    const response = await api.post(
      `/edo/doc-builder/projects/${id}/export/pdf/`,
      {},
      {
        responseType: "blob",
      }
    );
    return response.data;
  },

  importDocx: async (file: File): Promise<DocumentProject> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<DocumentProject>(
      "/edo/doc-builder/import/docx/",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  },

  importPdf: async (file: File): Promise<DocumentProject> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<DocumentProject>(
      "/edo/doc-builder/import/pdf/",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  },
};

export default api;
