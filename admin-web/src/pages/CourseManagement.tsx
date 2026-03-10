import { useState, useEffect, useCallback } from 'react';
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  listCsvCourses,
  addCsvCourse,
  type GolfCourse,
  type CsvCourse,
} from '../api/client';

const PAGE_SIZE = 20;
const CSV_PAGE_SIZE = 20;

export function CourseManagement() {
  const [courses, setCourses] = useState<GolfCourse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number>>({
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    postal_code: '',
    latitude: '',
    longitude: '',
    phone: '',
    website: '',
    holes: '18',
    par: '',
    course_type: '',
    price_range: '',
    rating: '',
    google_place_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // CSV file (backend/data/clubs.csv) state
  const [csvCourses, setCsvCourses] = useState<CsvCourse[]>([]);
  const [csvTotal, setCsvTotal] = useState(0);
  const [csvLoading, setCsvLoading] = useState(true);
  const [csvSearch, setCsvSearch] = useState('');
  const [csvPage, setCsvPage] = useState(0);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvForm, setCsvForm] = useState<Record<string, string>>({
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    postal_code: '',
    latitude: '',
    longitude: '',
    phone: '',
    website: '',
  });
  const [csvSaving, setCsvSaving] = useState(false);
  const [csvActionError, setCsvActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listCourses(search || undefined, PAGE_SIZE, page * PAGE_SIZE);
    setLoading(false);
    if (res.success) {
      setCourses(res.data);
      setTotal(res.total);
    } else setError(res.message || 'Failed to load courses');
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const loadCsv = useCallback(async () => {
    setCsvLoading(true);
    setCsvError(null);
    const res = await listCsvCourses(csvSearch || undefined, CSV_PAGE_SIZE, csvPage * CSV_PAGE_SIZE);
    setCsvLoading(false);
    if (res.success) {
      setCsvCourses(res.data);
      setCsvTotal(res.total);
    } else setCsvError(res.message || 'Failed to load CSV courses');
  }, [csvSearch, csvPage]);

  useEffect(() => {
    loadCsv();
  }, [loadCsv]);

  const openAdd = () => {
    setForm({
      name: '',
      address: '',
      city: '',
      state: '',
      country: 'USA',
      postal_code: '',
      latitude: '',
      longitude: '',
      phone: '',
      website: '',
      holes: '18',
      par: '',
      course_type: '',
      price_range: '',
      rating: '',
      google_place_id: '',
    });
    setModal('add');
    setActionError(null);
  };

  const openEdit = async (id: string) => {
    setActionError(null);
    const res = await getCourse(id);
    if (!res.success || !res.data) {
      setActionError(res.message || 'Failed to load course');
      return;
    }
    const c = res.data;
    setForm({
      name: c.name ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      country: c.country ?? 'USA',
      postal_code: c.postal_code ?? '',
      latitude: c.latitude != null ? c.latitude : '',
      longitude: c.longitude != null ? c.longitude : '',
      phone: c.phone ?? '',
      website: c.website ?? '',
      holes: c.holes != null ? c.holes : '18',
      par: c.par != null ? c.par : '',
      course_type: c.course_type ?? '',
      price_range: c.price_range ?? '',
      rating: c.rating != null ? c.rating : '',
      google_place_id: c.google_place_id ?? '',
    });
    setEditingId(id);
    setModal('edit');
  };

  const handleSave = async () => {
    const name = String(form.name ?? '').trim();
    if (!name) {
      setActionError('Name is required');
      return;
    }
    setSaving(true);
    setActionError(null);
    const payload = {
      name,
      address: form.address ? String(form.address).trim() : undefined,
      city: form.city ? String(form.city).trim() : undefined,
      state: form.state ? String(form.state).trim() : undefined,
      country: form.country ? String(form.country).trim() : undefined,
      postal_code: form.postal_code ? String(form.postal_code).trim() : undefined,
      latitude: form.latitude !== '' ? Number(form.latitude) : undefined,
      longitude: form.longitude !== '' ? Number(form.longitude) : undefined,
      phone: form.phone ? String(form.phone).trim() : undefined,
      website: form.website ? String(form.website).trim() : undefined,
      holes: form.holes !== '' ? Number(form.holes) : undefined,
      par: form.par !== '' ? Number(form.par) : undefined,
      course_type: form.course_type ? String(form.course_type).trim() : undefined,
      price_range: form.price_range ? String(form.price_range).trim() : undefined,
      rating: form.rating !== '' ? Number(form.rating) : undefined,
      google_place_id: form.google_place_id ? String(form.google_place_id).trim() : undefined,
    };
    if (modal === 'add') {
      const res = await createCourse(payload);
      setSaving(false);
      if (res.success) {
        setModal(null);
        load();
      } else setActionError(res.message || 'Create failed');
    } else if (editingId) {
      const res = await updateCourse(editingId, payload);
      setSaving(false);
      if (res.success) {
        setModal(null);
        setEditingId(null);
        load();
      } else setActionError(res.message || 'Update failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this course from the database? This cannot be undone.')) return;
    setDeletingId(id);
    setActionError(null);
    const res = await deleteCourse(id);
    setDeletingId(null);
    if (res.success) load();
    else setActionError(res.message || 'Delete failed');
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const csvTotalPages = Math.max(1, Math.ceil(csvTotal / CSV_PAGE_SIZE));

  const openCsvAdd = () => {
    setCsvForm({ name: '', address: '', city: '', state: '', country: 'USA', postal_code: '', latitude: '', longitude: '', phone: '', website: '' });
    setCsvModalOpen(true);
    setCsvActionError(null);
  };

  const handleCsvSave = async () => {
    const name = (csvForm.name || '').trim();
    if (!name) {
      setCsvActionError('Name is required');
      return;
    }
    setCsvSaving(true);
    setCsvActionError(null);
    const res = await addCsvCourse({
      name,
      address: csvForm.address?.trim() || undefined,
      city: csvForm.city?.trim() || undefined,
      state: csvForm.state?.trim() || undefined,
      country: csvForm.country?.trim() || undefined,
      postal_code: csvForm.postal_code?.trim() || undefined,
      latitude: csvForm.latitude ? Number(csvForm.latitude) : undefined,
      longitude: csvForm.longitude ? Number(csvForm.longitude) : undefined,
      phone: csvForm.phone?.trim() || undefined,
      website: csvForm.website?.trim() || undefined,
    });
    setCsvSaving(false);
    if (res.success) {
      setCsvModalOpen(false);
      loadCsv();
    } else setCsvActionError(res.message || 'Failed to add to CSV');
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Golf courses</h2>
      <p style={styles.subtitle}>
        Course list from the database used for autocomplete. Add, edit, or remove courses to keep results current.
        {!loading && total >= 0 && (
          <span style={styles.count}> — {total} course{total !== 1 ? 's' : ''} total</span>
        )}
      </p>
      <div style={styles.toolbar}>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by name, city, state..."
          style={styles.input}
        />
        <button type="button" onClick={openAdd} style={styles.primaryBtn}>
          Add course
        </button>
      </div>
      {error && <div style={styles.error}>{error}</div>}
      {actionError && <div style={styles.error}>{actionError}</div>}
      {loading ? (
        <p style={styles.muted}>Loading…</p>
      ) : courses.length === 0 ? (
        <p style={styles.muted}>{search ? 'No courses match your search.' : 'No courses yet. Add one to get started.'}</p>
      ) : (
        <>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Address</th>
                  <th style={styles.th}>City</th>
                  <th style={styles.th}>State</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Holes</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} style={styles.tr}>
                    <td style={styles.td}>{c.name ?? '—'}</td>
                    <td style={styles.td}>{c.address ?? '—'}</td>
                    <td style={styles.td}>{c.city ?? '—'}</td>
                    <td style={styles.td}>{c.state ?? '—'}</td>
                    <td style={styles.td}>{c.phone ?? '—'}</td>
                    <td style={styles.td}>{c.holes ?? '—'}</td>
                    <td style={styles.td}>
                      <button type="button" onClick={() => openEdit(c.id)} style={styles.linkBtn}>Edit</button>
                      {' · '}
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        style={{ ...styles.linkBtn, color: 'var(--color-error)' }}
                        disabled={deletingId === c.id}
                      >
                        {deletingId === c.id ? '…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={styles.smallBtn}>
                Previous
              </button>
              <span style={styles.pageInfo}>Page {page + 1} of {totalPages} ({total} total)</span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={styles.smallBtn}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      {modal && (
        <div style={styles.modalOverlay} onClick={() => !saving && setModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{modal === 'add' ? 'Add course' : 'Edit course'}</h3>
            <div style={styles.form}>
              {(['name', 'address', 'city', 'state', 'country', 'postal_code', 'phone', 'website', 'holes', 'par', 'course_type', 'price_range', 'rating', 'google_place_id'] as const).map((key) => (
                <label key={key} style={styles.label}>
                  {key.replace(/_/g, ' ')}
                  <input
                    type={key === 'latitude' || key === 'longitude' || key === 'holes' || key === 'par' || key === 'rating' ? 'number' : 'text'}
                    value={String(form[key] ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={styles.input}
                    placeholder={key === 'name' ? 'Required' : ''}
                  />
                </label>
              ))}
              <label style={styles.label}>
                latitude
                <input
                  type="number"
                  step="any"
                  value={String(form.latitude ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                  style={styles.input}
                />
              </label>
              <label style={styles.label}>
                longitude
                <input
                  type="number"
                  step="any"
                  value={String(form.longitude ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                  style={styles.input}
                />
              </label>
            </div>
            <div style={styles.modalActions}>
              <button type="button" onClick={() => !saving && setModal(null)} style={styles.secondaryBtn}>Cancel</button>
              <button type="button" onClick={handleSave} style={styles.primaryBtn} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <hr style={styles.sectionDivider} />
      <h3 style={styles.sectionTitle}>Courses from CSV file (backend/data/clubs.csv)</h3>
      <p style={styles.subtitle}>
        Read and add courses to backend/data/clubs.csv used for club search. New rows are appended to the file.
        {!csvLoading && csvTotal >= 0 && (
          <span style={styles.count}> — {csvTotal} course{csvTotal !== 1 ? 's' : ''} in file</span>
        )}
      </p>
      <div style={styles.toolbar}>
        <input
          type="text"
          value={csvSearch}
          onChange={(e) => { setCsvSearch(e.target.value); setCsvPage(0); }}
          placeholder="Search CSV by name, city, state..."
          style={styles.input}
        />
        <button type="button" onClick={openCsvAdd} style={styles.primaryBtn}>
          Add to CSV
        </button>
      </div>
      {csvError && <div style={styles.error}>{csvError}</div>}
      {csvActionError && <div style={styles.error}>{csvActionError}</div>}
      {csvLoading ? (
        <p style={styles.muted}>Loading CSV…</p>
      ) : csvCourses.length === 0 ? (
        <p style={styles.muted}>{csvSearch ? 'No CSV courses match your search.' : 'CSV file is empty or not loaded.'}</p>
      ) : (
        <>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Address</th>
                  <th style={styles.th}>City</th>
                  <th style={styles.th}>State</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>ID</th>
                </tr>
              </thead>
              <tbody>
                {csvCourses.map((c) => (
                  <tr key={c.id} style={styles.tr}>
                    <td style={styles.td}>{c.name ?? '—'}</td>
                    <td style={styles.td}>{c.address ?? '—'}</td>
                    <td style={styles.td}>{c.city ?? '—'}</td>
                    <td style={styles.td}>{c.state ?? '—'}</td>
                    <td style={styles.td}>{c.telephone ?? '—'}</td>
                    <td style={styles.td}>{c.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {csvTotalPages > 1 && (
            <div style={styles.pagination}>
              <button type="button" onClick={() => setCsvPage((p) => Math.max(0, p - 1))} disabled={csvPage === 0} style={styles.smallBtn}>
                Previous
              </button>
              <span style={styles.pageInfo}>Page {csvPage + 1} of {csvTotalPages} ({csvTotal} total)</span>
              <button type="button" onClick={() => setCsvPage((p) => Math.min(csvTotalPages - 1, p + 1))} disabled={csvPage >= csvTotalPages - 1} style={styles.smallBtn}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      {csvModalOpen && (
        <div style={styles.modalOverlay} onClick={() => !csvSaving && setCsvModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add course to CSV</h3>
            {csvActionError && <div style={styles.error}>{csvActionError}</div>}
            <div style={styles.form}>
              {(['name', 'address', 'city', 'state', 'country', 'postal_code', 'phone', 'website', 'latitude', 'longitude'] as const).map((key) => (
                <label key={key} style={styles.label}>
                  {key.replace(/_/g, ' ')}
                  <input
                    type={key === 'latitude' || key === 'longitude' ? 'number' : 'text'}
                    step={key === 'latitude' || key === 'longitude' ? 'any' : undefined}
                    value={csvForm[key] ?? ''}
                    onChange={(e) => setCsvForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={styles.input}
                    placeholder={key === 'name' ? 'Required' : ''}
                  />
                </label>
              ))}
            </div>
            <div style={styles.modalActions}>
              <button type="button" onClick={() => !csvSaving && setCsvModalOpen(false)} style={styles.secondaryBtn}>Cancel</button>
              <button type="button" onClick={handleCsvSave} style={styles.primaryBtn} disabled={csvSaving}>
                {csvSaving ? 'Adding…' : 'Add to CSV'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { fontFamily: 'var(--font-family)' },
  title: { fontSize: 'var(--font-size-2xl)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-sm)' },
  subtitle: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' },
  count: { color: 'var(--color-text-muted)', fontWeight: 500 },
  sectionDivider: { border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-2xl) 0' },
  sectionTitle: { fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-sm)' },
  toolbar: { display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' },
  input: {
    padding: 'var(--space-sm) var(--space-md)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-base)',
    minWidth: 200,
  },
  primaryBtn: { padding: 'var(--space-md) var(--space-xl)', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: 'var(--color-on-primary)', fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { padding: 'var(--space-sm) var(--space-lg)', background: 'var(--color-surface-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' },
  smallBtn: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--font-size-sm)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--color-surface)' },
  error: { padding: 'var(--space-md)', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-lg)' },
  muted: { color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' },
  tableWrap: { overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' },
  th: { textAlign: 'left', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: 'var(--space-md) var(--space-lg)' },
  linkBtn: { background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0 },
  pagination: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' },
  pageInfo: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-2xl)', maxWidth: 520, width: '90%', maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { marginBottom: 'var(--space-lg)' },
  form: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' },
  modalActions: { display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-xl)' },
};
