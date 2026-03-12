import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { templatesApi } from "../api/client";
import type { Template, TemplateVersion, VisibilityType } from "../api/types";

export default function EditTemplate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [template, setTemplate] = useState<Template | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<VisibilityType>("PUBLIC");
  const [htmlContent, setHtmlContent] = useState("");
  const [allowedUsers, setAllowedUsers] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "versions" | "share">(
    "edit"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadTemplate();
      loadVersions();
    } else {
      setError("Template ID is missing");
      setLoading(false);
    }
  }, [id]);

  const loadTemplate = async () => {
    if (!id) return;
    
    try {
      const data = await templatesApi.get(Number(id));
      setTemplate(data);
      setTitle(data.title);
      setDescription(data.description);
      setVisibility(data.visibility);
      setHtmlContent(data.html_content);
      setAllowedUsers(data.allowed_users.join(", "));
    } catch (err) {
      setError("Failed to load template");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    if (!id) return;
    
    try {
      const data = await templatesApi.getVersions(Number(id));
      setVersions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const parsedUsers = allowedUsers
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s)
        .map((s) => parseInt(s, 10))
        .filter((n) => !isNaN(n));

      const updated = await templatesApi.update(template.id, {
        title,
        description,
        visibility,
        html_content: htmlContent,
        allowed_users: parsedUsers,
      });
      setTemplate(updated);
      setSuccess("Template saved successfully!");
      loadVersions();
    } catch (err) {
      setError("Failed to save template");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !template) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await templatesApi.uploadDocx(template.id, file);
      setTemplate(updated);
      setSuccess("DOCX template uploaded successfully!");
      loadVersions();
    } catch (err) {
      setError("Failed to upload DOCX file");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = async (versionId: number) => {
    if (!template) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await templatesApi.restoreVersion(template.id, versionId);
      setTemplate(updated);
      setHtmlContent(updated.html_content);
      setSuccess("Version restored successfully!");
      loadVersions();
    } catch (err) {
      setError("Failed to restore version");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateShareLink = async () => {
    if (!template) return;
    setSaving(true);
    setError(null);
    try {
      await templatesApi.createShareLink(template.id, {
        ttl_days: 7,
        max_uses: 50,
      });
      await loadTemplate();
      setSuccess("Share link created!");
    } catch (err) {
      setError("Failed to create share link");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard!");
  };

  const handleDelete = async () => {
    if (
      !template ||
      !window.confirm("Are you sure you want to delete this template?")
    )
      return;
    try {
      await templatesApi.delete(template.id);
      navigate("/edo");
    } catch (err) {
      setError("Failed to delete template");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!template) {
    return <div className="error-message">Template not found</div>;
  }

  return (
    <div>
      <div className="hero-bs mb-6">
        <div className="flex flex-between">
          <div>
            <h1>{template.title}</h1>
            <div className="flex gap-2 mt-4">
              <span
                className={`badge badge-${template.template_type.toLowerCase()}`}
              >
                {template.template_type}
              </span>
              <span
                className={`badge badge-${template.visibility.toLowerCase()}`}
              >
                {template.visibility}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/render/${template.id}`)}
              className="btn btn-primary"
            >
              Сгенерировать документ
            </button>
            <button
              onClick={() =>
                navigate("/templates/new", {
                  state: { templateToEdit: template, templateId: template.id },
                })
              }
              className="btn btn-secondary"
            >
              Редактировать в визуальном редакторе
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-ghost"
              style={{ color: "#dc2626" }}
            >
              Удалить
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="tabs">
        <button
          className={`tab ${activeTab === "edit" ? "active" : ""}`}
          onClick={() => setActiveTab("edit")}
        >
          Edit
        </button>
        <button
          className={`tab ${activeTab === "versions" ? "active" : ""}`}
          onClick={() => setActiveTab("versions")}
        >
          Versions ({versions.length})
        </button>
        <button
          className={`tab ${activeTab === "share" ? "active" : ""}`}
          onClick={() => setActiveTab("share")}
        >
          Share Links ({template.share_links.length})
        </button>
      </div>

      {activeTab === "edit" && (
        <div className="surface" style={{ padding: "var(--sp-6)" }}>
          <div className="form-group">
            <label className="label" htmlFor="title">
              Title
            </label>
            <input
              type="text"
              id="title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className="input textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="visibility">
              Visibility
            </label>
            <select
              id="visibility"
              className="select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as VisibilityType)}
            >
              <option value="PUBLIC">Public</option>
              <option value="RESTRICTED">Restricted</option>
            </select>
          </div>

          {visibility === "RESTRICTED" && (
            <div className="form-group">
              <label className="label" htmlFor="allowed_users">
                Allowed User IDs (comma separated)
              </label>
              <input
                type="text"
                id="allowed_users"
                className="input"
                value={allowedUsers}
                onChange={(e) => setAllowedUsers(e.target.value)}
                placeholder="e.g., 2, 3, 5"
              />
            </div>
          )}

          {template.template_type === "HTML" ? (
            <div className="form-group">
              <label className="label">HTML Content</label>
              <p
                className="text-muted-ink mb-2"
                style={{ fontSize: "var(--fs-5)" }}
              >
                Use {"{{placeholder}}"} syntax for dynamic fields. Found:{" "}
                {template.placeholders.join(", ") || "none"}
              </p>
              <textarea
                className="editor-textarea"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="label">DOCX Template File</label>
              {template.docx_file ? (
                <div className="mb-4">
                  <p className="text-muted-ink">
                    Current file: {template.docx_file.split("/").pop()}
                  </p>
                  <p
                    className="text-muted-ink"
                    style={{ fontSize: "var(--fs-5)" }}
                  >
                    Placeholders found:{" "}
                    {template.placeholders.join(", ") || "none"}
                  </p>
                </div>
              ) : (
                <p className="text-muted-ink mb-4">
                  No DOCX file uploaded yet.
                </p>
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept=".docx"
                onChange={handleUploadDocx}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                {template.docx_file ? "Заменить DOCX файл" : "Загрузить DOCX файл"}
              </button>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => navigate("/edo")}
              className="btn btn-secondary"
            >
              Вернуться на главную
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "versions" && (
        <div className="surface" style={{ padding: "var(--sp-6)" }}>
          {versions.length === 0 ? (
            <p className="text-muted-ink">
              No previous versions. Versions are created when you save changes.
            </p>
          ) : (
            <div className="version-list">
              {versions.map((version) => (
                <div key={version.id} className="version-item">
                  <div>
                    <strong>Version {version.version_number}</strong>
                    <p
                      className="text-muted-ink"
                      style={{ fontSize: "var(--fs-5)" }}
                    >
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleRestoreVersion(version.id)}
                    disabled={saving}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "share" && (
        <div className="surface" style={{ padding: "var(--sp-6)" }}>
          <div className="flex flex-between mb-6">
            <div>
              <h3>Ссылки для общего доступа</h3>
              <p className="text-muted-ink" style={{ fontSize: "var(--fs-5)" }}>
                Создайте ссылки, которые позволят любому сгенерировать документ из этого шаблона
              </p>
            </div>
            <button
              onClick={handleCreateShareLink}
              className="btn btn-primary"
              disabled={saving}
            >
              Создать ссылку
            </button>
          </div>

          {template.share_links.length === 0 ? (
            <p className="text-muted-ink">Ссылки для общего доступа еще не созданы.</p>
          ) : (
            <div>
              {template.share_links.map((link) => (
                <div key={link.id} className="share-link-item">
                  <div>
                    <code className="share-link-token">{link.token}</code>
                    <p
                      className="text-muted-ink mt-2"
                      style={{ fontSize: "var(--fs-5)" }}
                    >
                      Использований: {link.current_uses}/{link.max_uses} | Истекает:{" "}
                      {new Date(link.expires_at).toLocaleDateString()} | Status:{" "}
                      {link.is_valid ? "✅ Valid" : "❌ Expired"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}/share/${link.token}`
                        )
                      }
                    >
                      Copy Link
                    </button>
                    <a
                      href={`/share/${link.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost"
                    >
                      Open
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
