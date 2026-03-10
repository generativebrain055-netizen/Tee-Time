import { useState, useEffect, useCallback } from 'react';
import {
  listCsvCourses,
  addCsvCourse,
  updateCsvCourse,
  deleteCsvCourse,
  PAGE_SIZE_OPTIONS,
  type CsvCourse,
} from '../api/client';

export function CourseManagement() {
  const [courses, setCourses] = useState<CsvCourse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
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
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<CsvCourse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<CsvCourse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listCsvCourses(search || undefined, pageSize, page * pageSize);
    setLoading(false);
    if (res.success) {
      setCourses(res.data);
      setTotal(res.total);
    } else setError(res.message || 'Failed to load courses');
  }, [search, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditingCourse(null);
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
    });
    setModalOpen(true);
    setActionError(null);
  };

  const openEdit = (c: CsvCourse) => {
    setEditingCourse(c);
    setForm({
      name: c.name ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      country: c.country ?? 'USA',
      postal_code: c.postalCode ?? '',
      latitude: c.latitude != null ? String(c.latitude) : '',
      longitude: c.longitude != null ? String(c.longitude) : '',
      phone: c.telephone ?? c.phone ?? '',
      website: c.website ?? '',
    });
    setModalOpen(true);
    setActionError(null);
  };

  const handleSave = async () => {
    const name = (form.name || '').trim();
    if (!name) {
      setActionError('Name is required');
      return;
    }
    setSaving(true);
    setActionError(null);
    const payload = {
      name,
      address: form.address?.trim() || undefined,
      city: form.city?.trim() || undefined,
      state: form.state?.trim() || undefined,
      country: form.country?.trim() || undefined,
      postal_code: form.postal_code?.trim() || undefined,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      phone: form.phone?.trim() || undefined,
      website: form.website?.trim() || undefined,
    };
    const res = editingCourse
      ? await updateCsvCourse(editingCourse.id, payload)
      : await addCsvCourse(payload);
    setSaving(false);
    if (res.success) {
      setModalOpen(false);
      setEditingCourse(null);
      load();
    } else setActionError(res.message || (editingCourse ? 'Failed to update course' : 'Failed to add course'));
  };

  const openDeleteConfirm = (c: CsvCourse) => {
    setCourseToDelete(c);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;
    const idToDelete = courseToDelete.id;
    setDeletingId(idToDelete);
    const res = await deleteCsvCourse(idToDelete);
    setDeletingId(null);
    setCourseToDelete(null);
    if (res.success) {
      setActionError(null);
      setCourses((prev) => prev.filter((c) => c.id !== idToDelete));
      setTotal((prev) => Math.max(0, prev - 1));
      await load();
    } else setActionError(res.message || 'Failed to delete course');
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Golf courses</h2>
      <p style={styles.subtitle}>
        Courses are stored in the database (golf_courses table). Add, edit, or remove courses here.
        {!loading && total >= 0 && (
          <span style={styles.count}> — {total} course{total !== 1 ? 's' : ''}</span>
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
        <div style={styles.toolbarRight}>
          <label style={styles.pageSizeLabel}>
            Per page
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} style={styles.select}>
              {PAGE_SIZE_OPTIONS.map((n: number) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          {!loading && totalPages > 1 && (
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
        </div>
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
                  <th style={styles.th}>Ongoing booked</th>
                  <th style={styles.th}>ID</th>
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
                    <td style={styles.td}>{c.telephone ?? '—'}</td>
                    <td style={styles.td}>{typeof c.ongoingBooked === 'number' ? c.ongoingBooked : '—'}</td>
                    <td style={styles.td}>{c.id}</td>
                    <td style={styles.td}>
                      <div style={styles.cellActions}>
                        <button type="button" onClick={() => openEdit(c)} style={styles.linkBtn}>Edit</button>
                        <button type="button" onClick={() => openDeleteConfirm(c)} style={styles.deleteBtn} disabled={deletingId === c.id}>
                          {deletingId === c.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {courseToDelete && (
        <div style={styles.modalOverlay} onClick={() => !deletingId && setCourseToDelete(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Delete course</h3>
            <p style={styles.confirmMessage}>
              Delete course &quot;{courseToDelete.name ?? courseToDelete.id}&quot;? This cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button type="button" onClick={() => !deletingId && setCourseToDelete(null)} style={styles.secondaryBtn} disabled={!!deletingId}>
                Cancel
              </button>
              <button type="button" onClick={handleDeleteConfirm} style={styles.deleteConfirmBtn} disabled={!!deletingId}>
                {deletingId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div style={styles.modalOverlay} onClick={() => !saving && setModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{editingCourse ? 'Edit course' : 'Add course'}</h3>
            {actionError && <div style={styles.error}>{actionError}</div>}
            <div style={styles.form}>
              {(['name', 'address', 'city', 'state', 'country', 'postal_code', 'phone', 'website', 'latitude', 'longitude'] as const).map((key) => (
                <label key={key} style={styles.label}>
                  {key.replace(/_/g, ' ')}
                  <input
                    type={key === 'latitude' || key === 'longitude' ? 'number' : 'text'}
                    step={key === 'latitude' || key === 'longitude' ? 'any' : undefined}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={styles.input}
                    placeholder={key === 'name' ? 'Required' : ''}
                  />
                </label>
              ))}
            </div>
            <div style={styles.modalActions}>
              <button type="button" onClick={() => !saving && setModalOpen(false)} style={styles.secondaryBtn}>Cancel</button>
              <button type="button" onClick={handleSave} style={styles.primaryBtn} disabled={saving}>
                {saving ? (editingCourse ? 'Saving…' : 'Adding…') : (editingCourse ? 'Save' : 'Add course')}
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
  toolbar: { display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginLeft: 'auto', flexWrap: 'wrap' },
  pageSizeLabel: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' },
  select: { padding: 'var(--space-sm) var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' },
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
  cellActions: { display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' },
  linkBtn: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--font-size-sm)', border: 'none', background: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' },
  deleteBtn: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--font-size-sm)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--color-surface)', color: 'var(--color-error)' },
  confirmMessage: { marginBottom: 'var(--space-lg)', color: 'var(--color-text-primary)' },
  deleteConfirmBtn: { padding: 'var(--space-md) var(--space-xl)', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-error)', color: 'var(--color-on-primary)', fontWeight: 600, cursor: 'pointer' },
  error: { padding: 'var(--space-md)', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-lg)' },
  muted: { color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' },
  tableWrap: { overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' },
  th: { textAlign: 'left', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-secondary)' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: 'var(--space-md) var(--space-lg)' },
  pagination: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)' },
  pageInfo: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-2xl)', maxWidth: 520, width: '90%', maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { marginBottom: 'var(--space-lg)' },
  form: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-sm)' },
  modalActions: { display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-xl)' },
};
