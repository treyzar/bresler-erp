import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { shareApi } from '../api/client';
import type { ShareInfo } from '../api/types';

export default function ShareRender() {
  const { token } = useParams<{ token: string }>();

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadShareInfo();
    } else {
      setError("Share token is missing");
      setLoading(false);
    }
  }, [token]);

  const loadShareInfo = async () => {
    if (!token) return;
    
    try {
      const data = await shareApi.getInfo(token);
      setShareInfo(data);
      const initialValues: Record<string, string> = {};
      data.placeholders.forEach((p) => {
        initialValues[p] = '';
      });
      setValues(initialValues);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || 'Failed to load share link');
      } else {
        setError('Failed to load share link');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleRender = async () => {
    if (!shareInfo || !token) return;
    setRendering(true);
    setError(null);

    try {
      const blob = await shareApi.render(token, { values });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = shareInfo.template_type === 'HTML' 
        ? `${shareInfo.title}.pdf` 
        : `${shareInfo.title}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to render document');
      console.error(err);
    } finally {
      setRendering(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--sp-8)' }}>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !shareInfo) {
    return (
      <div className="container-1600" style={{ paddingTop: 'var(--sp-8)' }}>
        <div className="error-message">
          {error || 'Share link not found or expired'}
        </div>
      </div>
    );
  }

  return (
    <div className="container-1600" style={{ paddingTop: 'var(--sp-6)' }}>
      <div className="hero-bs mb-6">
        <div className="flex gap-2 mb-4">
          <span className="accent-dot"></span>
          <span className="text-muted-ink">Shared Document</span>
        </div>
        <h1>{shareInfo.title}</h1>
        {shareInfo.description && (
          <p className="text-muted-ink mt-4">{shareInfo.description}</p>
        )}
        <div className="flex gap-2 mt-4">
          <span className={`badge badge-${shareInfo.template_type.toLowerCase()}`}>
            {shareInfo.template_type === 'HTML' ? 'Exports to PDF' : 'Exports to DOCX'}
          </span>
          <span className="badge">
            Uses: {shareInfo.share_link.current_uses}/{shareInfo.share_link.max_uses}
          </span>
        </div>
      </div>

      <div className="surface" style={{ padding: 'var(--sp-6)', maxWidth: '600px' }}>
        {shareInfo.placeholders.length === 0 ? (
          <div className="mb-6">
            <p className="text-muted-ink">
              This template has no placeholders. Click render to generate the document.
            </p>
          </div>
        ) : (
          <div>
            <h3 className="mb-4">Fill in the fields</h3>
            {shareInfo.placeholders.map((placeholder) => (
              <div key={placeholder} className="form-group">
                <label className="label" htmlFor={placeholder}>
                  {placeholder.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </label>
                <input
                  type="text"
                  id={placeholder}
                  className="input"
                  value={values[placeholder] || ''}
                  onChange={(e) => handleValueChange(placeholder, e.target.value)}
                  placeholder={`Enter ${placeholder}`}
                />
              </div>
            ))}
          </div>
        )}

        <button onClick={handleRender} className="btn btn-primary" disabled={rendering} style={{ width: '100%' }}>
          {rendering ? 'Generating...' : `Download ${shareInfo.template_type === 'HTML' ? 'PDF' : 'DOCX'}`}
        </button>
      </div>
    </div>
  );
}
