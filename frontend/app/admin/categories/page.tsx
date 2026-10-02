'use client';

import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../../components/admin/AdminShell';
import styles from './page.module.css';

type Category = { id: number; name: string; slug: string; sortOrder: number; isActive: boolean | 0 | 1 };
type FormValues = { name: string; slug: string; sortOrder: string; isActive: boolean };
type AdminUser = { username: string; role: string; mustChangePassword: boolean };
type OpenActions = { id: number; top: number; left: number };

const emptyForm: FormValues = { name: '', slug: '', sortOrder: '0', isActive: true };
const toBoolean = (value: boolean | 0 | 1) => value === true || value === 1;

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [editing, setEditing] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openActions, setOpenActions] = useState<OpenActions | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<number, HTMLButtonElement>());

  useEffect(() => {
    if (!openActions) return;
    const active = openActions;
    const close = () => setOpenActions(null);
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRefs.current.get(active.id)?.contains(target)) close();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); close(); triggerRefs.current.get(active.id)?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape); document.addEventListener('scroll', close, true); window.addEventListener('resize', close);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); document.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [openActions]);

  async function loadCategories() {
    const response = await fetch('/api/admin/categories', { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (response.status === 401 || response.status === 403) { router.replace('/admin'); return; }
    if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load categories.');
    setCategories(payload.data);
  }

  useEffect(() => {
    async function initialize() {
      try {
        const session = await fetch('/api/admin/session/me', { cache: 'no-store' });
        const sessionData = await session.json().catch(() => null);
        if (!session.ok || !sessionData?.user) { router.replace('/admin'); return; }
        if (sessionData.user.mustChangePassword) { router.replace('/admin/change-password'); return; }
        setCurrentUser(sessionData.user);
        await loadCategories();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to load categories.');
      } finally { setLoading(false); }
    }
    void initialize();
  // The initial protected load runs once; subsequent mutations explicitly refresh the list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function updateForm(field: keyof FormValues, value: string | boolean) { setForm((current) => ({ ...current, [field]: value })); }
  function resetForm() { setEditing(null); setForm(emptyForm); }
  async function refresh(message: string) { await loadCategories(); resetForm(); setSuccess(message); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSuccess(''); setSaving(true);
    const body = { name: form.name.trim(), slug: form.slug.trim(), sortOrder: Number(form.sortOrder), isActive: form.isActive };
    try {
      const response = await fetch(editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to save category.');
      await refresh(editing ? 'Category updated.' : 'Category created.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save category.'); }
    finally { setSaving(false); }
  }

  async function remove(category: Category) {
    if (!window.confirm(`Delete ${category.name}? This cannot be undone.`)) return;
    setError(''); setSuccess(''); setSaving(true);
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to delete category.');
      await refresh('Category deleted.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete category.'); }
    finally { setSaving(false); }
  }

  async function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= categories.length) return;
    setError(''); setSuccess(''); setSaving(true);
    const reordered = [...categories]; [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    try {
      const response = await fetch('/api/admin/categories/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: reordered.map((category, sortOrder) => ({ id: category.id, sortOrder })) }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to reorder categories.');
      await refresh('Category order updated.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to reorder categories.'); }
    finally { setSaving(false); }
  }

  function beginEdit(category: Category) { setEditing(category); setForm({ name: category.name, slug: category.slug, sortOrder: String(category.sortOrder), isActive: toBoolean(category.isActive) }); }
  function toggleActions(id: number, event: MouseEvent<HTMLButtonElement>) {
    if (openActions?.id === id) { setOpenActions(null); return; }
    const rect = event.currentTarget.getBoundingClientRect(); const width = 196; const height = 148;
    setOpenActions({ id, left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), top: window.innerHeight - rect.bottom >= height + 8 ? rect.bottom + 6 : Math.max(8, rect.top - height - 6) });
  }

  if (loading) return <main className={styles.page}><p role="status">Loading categories…</p></main>;
  if (!currentUser) return <main className={styles.page}><p className={styles.error} role="alert">The admin session is unavailable.</p></main>;

  return <AdminShell username={currentUser.username} role={currentUser.role} title="Categories">
    <section className={styles.layout} aria-labelledby="categories-title">
      <div className={styles.intro}><p className={styles.eyebrow}>Kebab Gyros</p><h2 id="categories-title">Categories</h2><p>Organize the stored categories used across the menu.</p></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}
      <div className={styles.columns}>
        <form className={styles.form} onSubmit={submit}><div><p className={styles.eyebrow}>Category details</p><h3>{editing ? 'Edit category' : 'Add category'}</h3></div><label htmlFor="category-name">Name<input id="category-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} disabled={saving} required maxLength={80}/></label><label htmlFor="category-slug">Slug<input id="category-slug" value={form.slug} onChange={(event) => updateForm('slug', event.target.value)} disabled={saving} required maxLength={80} pattern="[a-z0-9-]+"/></label><label htmlFor="category-order">Sort order<input id="category-order" type="number" min="0" value={form.sortOrder} onChange={(event) => updateForm('sortOrder', event.target.value)} disabled={saving} required/></label><label className={styles.checkbox}><input type="checkbox" checked={form.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} disabled={saving}/> Active</label><div className={styles.actions}><button disabled={saving} type="submit">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add category'}</button>{editing && <button disabled={saving} type="button" className={styles.secondary} onClick={resetForm}>Cancel</button>}</div></form>
        <section className={styles.listPanel} aria-labelledby="category-list-title"><div className={styles.listHeading}><div><p className={styles.eyebrow}>Current categories</p><h3 id="category-list-title">Stored categories</h3></div><p>“Popular” is virtual and is not managed here.</p></div>{categories.length === 0 ? <p className={styles.empty}>No stored categories yet. “Popular” is virtual and is not managed here.</p> : <div className={styles.tableWrap}><table><thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>Sort Order</th><th>Actions</th></tr></thead><tbody>{categories.map((category, index) => {
          const isOpen = openActions?.id === category.id;
          return <tr key={category.id}><td><strong>{category.name}</strong></td><td>/{category.slug}</td><td><span className={`${styles.status} ${category.isActive ? styles.active : styles.inactive}`}>{category.isActive ? 'Active' : 'Inactive'}</span></td><td>{category.sortOrder}</td><td><button ref={(element) => { if (element) triggerRefs.current.set(category.id, element); else triggerRefs.current.delete(category.id); }} type="button" className={styles.actionsTrigger} aria-label={`Actions for ${category.name}`} aria-haspopup="true" aria-expanded={isOpen} aria-controls={`category-actions-${category.id}`} disabled={saving} onClick={(event) => toggleActions(category.id, event)}>•••</button>{isOpen && <div ref={menuRef} id={`category-actions-${category.id}`} className={styles.actionsMenu} style={{ top: openActions.top, left: openActions.left }} aria-label={`Actions for ${category.name}`}>
            <button type="button" onClick={() => { setOpenActions(null); beginEdit(category); }}>Edit</button>
            <button type="button" disabled={saving || index === 0} title={index === 0 ? 'This is already the first category.' : undefined} onClick={() => { setOpenActions(null); void move(index, -1); }}>Move up</button>
            <button type="button" disabled={saving || index === categories.length - 1} title={index === categories.length - 1 ? 'This is already the last category.' : undefined} onClick={() => { setOpenActions(null); void move(index, 1); }}>Move down</button>
            <button type="button" className={styles.delete} onClick={() => { setOpenActions(null); void remove(category); }}>Delete</button>
          </div>}</td></tr>;
        })}</tbody></table></div>}</section>
      </div>
    </section>
  </AdminShell>;
}
