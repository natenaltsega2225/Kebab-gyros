'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

type Category = { id: number; name: string; slug: string; sortOrder: number; isActive: boolean };
type FormValues = { name: string; slug: string; sortOrder: string; isActive: boolean };
const emptyForm: FormValues = { name: '', slug: '', sortOrder: '0', isActive: true };

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [editing, setEditing] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        await loadCategories();
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load categories.'); }
      finally { setLoading(false); }
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
    try { const response = await fetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' }); const payload = await response.json().catch(() => null); if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to delete category.'); await refresh('Category deleted.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete category.'); }
    finally { setSaving(false); }
  }

  async function move(index: number, direction: -1 | 1) {
    const destination = index + direction; if (destination < 0 || destination >= categories.length) return;
    setError(''); setSuccess(''); setSaving(true);
    const reordered = [...categories]; [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    try { const response = await fetch('/api/admin/categories/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: reordered.map((category, sortOrder) => ({ id: category.id, sortOrder })) }) }); const payload = await response.json().catch(() => null); if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to reorder categories.'); await refresh('Category order updated.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to reorder categories.'); }
    finally { setSaving(false); }
  }

  if (loading) return <main className={styles.page}><p role="status">Loading categories…</p></main>;
  return <main className={styles.page}><section className={styles.layout}><header className={styles.header}><div><p className={styles.eyebrow}>Kebab Gyros</p><h1>Categories</h1></div><Link href="/admin/dashboard">Back to dashboard</Link></header>{error && <p className={styles.error} role="alert">{error}</p>}{success && <p className={styles.success} role="status">{success}</p>}<div className={styles.columns}><form className={styles.form} onSubmit={submit}><h2>{editing ? 'Edit category' : 'Add category'}</h2><label htmlFor="category-name">Name</label><input id="category-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} disabled={saving} required maxLength={80}/><label htmlFor="category-slug">Slug</label><input id="category-slug" value={form.slug} onChange={(event) => updateForm('slug', event.target.value)} disabled={saving} required maxLength={80} pattern="[a-z0-9-]+"/><label htmlFor="category-order">Sort order</label><input id="category-order" type="number" min="0" value={form.sortOrder} onChange={(event) => updateForm('sortOrder', event.target.value)} disabled={saving} required/><label className={styles.checkbox}><input type="checkbox" checked={form.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} disabled={saving}/> Active</label><div className={styles.actions}><button disabled={saving} type="submit">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add category'}</button>{editing && <button disabled={saving} type="button" className={styles.secondary} onClick={resetForm}>Cancel</button>}</div></form><section aria-labelledby="category-list-title"><h2 id="category-list-title">Stored categories</h2>{categories.length === 0 ? <p className={styles.empty}>No stored categories yet. “Popular” is virtual and is not managed here.</p> : <ol className={styles.list}>{categories.map((category, index) => <li key={category.id}><div><strong>{category.name}</strong><span>/{category.slug} · {category.isActive ? 'Active' : 'Inactive'} · Order {category.sortOrder}</span></div><div className={styles.rowActions}><button disabled={saving || index === 0} onClick={() => move(index, -1)} aria-label={`Move ${category.name} up`}>Up</button><button disabled={saving || index === categories.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${category.name} down`}>Down</button><button disabled={saving} onClick={() => { setEditing(category); setForm({ name: category.name, slug: category.slug, sortOrder: String(category.sortOrder), isActive: category.isActive }); }}>Edit</button><button disabled={saving} className={styles.delete} onClick={() => remove(category)}>Delete</button></div></li>)}</ol>}</section></div></section></main>;
}
