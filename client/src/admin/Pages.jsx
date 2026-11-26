import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useStore } from '../state/StoreContext.jsx';
import { useAdmin, useAdminData } from './AdminContext.jsx';
import { Badge, DataState, Field, PageHead, SaveBar, useUnsavedWarning } from './ui.jsx';

export function PageList() {
  const { data: pages, ...state } = useAdminData('/pages');
  const navigate = useNavigate();

  return (
    <div className="admin-page admin-page-narrow">
      <PageHead title="Pages">
        <Link to="/admin/pages/new" className="btn btn-small">Add page</Link>
      </PageHead>
      <p className="muted small">Pages such as About, FAQ and Shipping &amp; returns. Published pages are linked in the store footer.</p>
      <DataState {...state}>
        <section className="card card-flush">
          {pages?.length ? (
            <table className="table">
              <thead><tr><th>Title</th><th>Visibility</th><th>Address</th></tr></thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id} className="is-link" onClick={() => navigate(`/admin/pages/${page.id}`)}>
                    <td><Link to={`/admin/pages/${page.id}`}>{page.title}</Link></td>
                    <td>{page.published ? <Badge tone="success">Visible</Badge> : <Badge>Hidden</Badge>}</td>
                    <td className="muted mono">/pages/{page.handle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted" style={{ padding: '1.25rem' }}>No pages yet.</p>}
        </section>
      </DataState>
    </div>
  );
}

const EMPTY = { title: '', handle: '', body: '', published: true };

export function PageEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { api } = useAdmin();
  const [state, setState] = useState({ loading: !isNew, error: null, item: isNew ? EMPTY : null });

  useEffect(() => {
    if (isNew) return setState({ loading: false, error: null, item: EMPTY });
    let active = true;
    api.get(`/pages/${id}`)
      .then((item) => active && setState({ loading: false, error: null, item }))
      .catch((error) => active && setState({ loading: false, error: error.message, item: null }));
    return () => { active = false; };
  }, [api, id, isNew]);

  return (
    <div className="admin-page admin-page-narrow">
      <DataState loading={state.loading} error={state.error}>
        {state.item && <PageForm key={state.item.id || 'new'} initial={state.item} />}
      </DataState>
    </div>
  );
}

function PageForm({ initial }) {
  const isNew = !initial.id;
  const { api } = useAdmin();
  const store = useStore();
  const navigate = useNavigate();
  const [page, setPage] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  useUnsavedWarning(JSON.stringify(page) !== JSON.stringify(saved));
  const set = (patch) => setPage((prev) => ({ ...prev, ...patch }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = isNew ? await api.post('/pages', page) : await api.put(`/pages/${page.id}`, page);
      setPage(result);
      setSaved(result);
      await store.reload();
      if (isNew) navigate(`/admin/pages/${result.id}`, { replace: true });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the page "${page.title}"?`)) return;
    await api.remove(`/pages/${page.id}`);
    await store.reload();
    navigate('/admin/pages');
  }

  return (
    <form onSubmit={save}>
      <PageHead title={isNew ? 'Add page' : page.title || 'Untitled'} back={['/admin/pages', 'Pages']}>
        {!isNew && saved.published && <a href={`/pages/${saved.handle}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-small">View</a>}
      </PageHead>
      <section className="card form">
        <Field label="Title"><input value={page.title} onChange={(event) => set({ title: event.target.value })} required maxLength={100} /></Field>
        <Field label="Content" hint="Leave an empty line between paragraphs. Start a line with ## for a heading or - for a list item.">
          <textarea rows={16} value={page.body} onChange={(event) => set({ body: event.target.value })} maxLength={50000} />
        </Field>
        <Field label="URL handle" hint={`Address: /pages/${page.handle || 'generated-from-title'}`}>
          <input value={page.handle} onChange={(event) => set({ handle: event.target.value.toLowerCase() })} placeholder="generated from the title" maxLength={80} />
        </Field>
        <label className="checkbox-inline"><input type="checkbox" checked={page.published} onChange={(event) => set({ published: event.target.checked })} />Visible in the store</label>
      </section>
      <SaveBar saving={saving} error={error} onDelete={isNew ? null : remove} />
    </form>
  );
}
