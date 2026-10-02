'use client';
/* eslint-disable @next/next/no-img-element -- Local blob URLs cannot use Next image optimization. */

import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../../components/admin/AdminShell';
import styles from './page.module.css';

type Category = { id: number; name: string };
type AdminUser = { username: string; role: string; mustChangePassword: boolean };
type Item = { id: number; categoryId: number; categoryName: string; name: string; description: string | null; price: number | string; imageUrl: string | null; isPopular: boolean | 0 | 1; isActive: boolean | 0 | 1 };
type FormValues = { categoryId: string; name: string; description: string; price: string; isPopular: boolean; isActive: boolean };
type OpenActions = { itemId: number; top: number; left: number };

const emptyForm: FormValues = { categoryId: '', name: '', description: '', price: '', isPopular: false, isActive: true };
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const toBoolean = (value: boolean | 0 | 1) => value === true || value === 1;

export default function MenuPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [editing, setEditing] = useState<Item | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [openActions, setOpenActions] = useState<OpenActions | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionTriggerRefs = useRef(new Map<number, HTMLButtonElement>());

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    if (!openActions) return;
    const activeActions = openActions;

    function closeForOutsideClick(event: PointerEvent) {
      const target = event.target as Node;
      const trigger = actionTriggerRefs.current.get(activeActions.itemId);
      if (!actionMenuRef.current?.contains(target) && !trigger?.contains(target)) setOpenActions(null);
    }
    function closeForEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpenActions(null);
      actionTriggerRefs.current.get(activeActions.itemId)?.focus();
    }
    function closeForViewportChange() { setOpenActions(null); }

    document.addEventListener('pointerdown', closeForOutsideClick);
    document.addEventListener('keydown', closeForEscape);
    document.addEventListener('scroll', closeForViewportChange, true);
    window.addEventListener('resize', closeForViewportChange);
    return () => {
      document.removeEventListener('pointerdown', closeForOutsideClick);
      document.removeEventListener('keydown', closeForEscape);
      document.removeEventListener('scroll', closeForViewportChange, true);
      window.removeEventListener('resize', closeForViewportChange);
    };
  }, [openActions]);

  async function load() {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (categoryFilter) params.set('categoryId', categoryFilter);
    const response = await fetch(`/api/admin/menu-items${params.size ? `?${params}` : ''}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (response.status === 401 || response.status === 403) { router.replace('/admin'); return; }
    if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load menu items.');
    setItems(payload.data);
  }

  useEffect(() => {
    async function initialize() {
      try {
        const session = await fetch('/api/admin/session/me', { cache: 'no-store' });
        const sessionData = await session.json().catch(() => null);
        if (!session.ok || !sessionData?.user) { router.replace('/admin'); return; }
        if (sessionData.user.mustChangePassword) { router.replace('/admin/change-password'); return; }
        setCurrentUser(sessionData.user);
        const categoryResponse = await fetch('/api/admin/categories', { cache: 'no-store' });
        const categoryData = await categoryResponse.json().catch(() => null);
        if (!categoryResponse.ok || !categoryData?.success) throw new Error(categoryData?.error || 'Unable to load categories.');
        setCategories(categoryData.data.filter((category: Category) => category.name.toLowerCase() !== 'popular'));
        await load();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to load menu.');
      } finally {
        setLoading(false);
      }
    }
    void initialize();
  // The initial protected load runs once; searches and mutations explicitly refresh results.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function updateForm<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) { setForm((current) => ({ ...current, [key]: value })); }
  function clearPreview() { if (preview) URL.revokeObjectURL(preview); setPreview(''); setFile(null); }
  function resetForm() { setEditing(null); setForm(emptyForm); clearPreview(); }

  function chooseFile(selected: File | null) {
    clearPreview();
    if (!selected) return;
    if (!allowedImageTypes.includes(selected.type)) { setError('Use a JPG, PNG, or WebP image.'); return; }
    if (selected.size > 5 * 1024 * 1024) { setError('Image files must be 5 MB or smaller.'); return; }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      let imageUrl: string | undefined;
      if (!editing && file) imageUrl = await uploadSelectedImage();
      const body = { categoryId: Number(form.categoryId), name: form.name.trim(), description: form.description.trim() || null, price: Number(form.price), isPopular: form.isPopular, isActive: form.isActive, ...(imageUrl ? { imageUrl } : {}) };
      const response = await fetch(editing ? `/api/admin/menu-items/${editing.id}` : '/api/admin/menu-items', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(imageUrl ? `Photo uploaded, but the item could not be created: ${payload?.error || 'Please try adding it again.'}` : payload?.error || 'Unable to save menu item.');
      await load(); resetForm(); setSuccess(editing ? 'Menu item updated.' : 'Menu item created.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save menu item.');
    } finally { setBusy(false); }
  }

  async function uploadSelectedImage() {
    if (!file) throw new Error('Choose an image before uploading.');
    const formData = new FormData(); formData.set('file', file);
    const response = await fetch('/api/admin/menu-items/upload-image', { method: 'POST', body: formData });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success || !payload.data?.url) throw new Error(payload?.error || 'Photo could not be uploaded. The item was not created; choose a valid image and try again.');
    return payload.data.url as string;
  }

  async function uploadImage() {
    if (!editing || !file) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const imageUrl = await uploadSelectedImage();
      const patchResponse = await fetch(`/api/admin/menu-items/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl }) });
      const patchData = await patchResponse.json().catch(() => null);
      if (!patchResponse.ok || !patchData?.success) throw new Error(`Image uploaded, but it could not be saved to this item: ${patchData?.error || 'Please try saving again.'}`);
      setEditing({ ...editing, imageUrl });
      setItems((current) => current.map((item) => item.id === editing.id ? { ...item, imageUrl } : item));
      clearPreview(); setSuccess('Image uploaded and saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to upload image.');
    } finally { setBusy(false); }
  }

  async function removeItem(item: Item) {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/menu-items/${item.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to delete menu item.');
      await load(); setSuccess('Menu item deleted.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete menu item.'); }
    finally { setBusy(false); }
  }

  async function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= items.length) return;
    setBusy(true); setError(''); setSuccess('');
    const reordered = [...items]; [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    try {
      const response = await fetch('/api/admin/menu-items/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: reordered.map((item, sortOrder) => ({ id: item.id, sortOrder })) }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to reorder menu items.');
      await load(); setSuccess('Menu item order updated.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to reorder menu items.'); }
    finally { setBusy(false); }
  }

  function beginEdit(item: Item) {
    resetForm(); setEditing(item);
    setForm({ categoryId: String(item.categoryId), name: item.name, description: item.description || '', price: String(item.price), isPopular: toBoolean(item.isPopular), isActive: toBoolean(item.isActive) });
  }

  function toggleActions(itemId: number, event: MouseEvent<HTMLButtonElement>) {
    if (openActions?.itemId === itemId) { setOpenActions(null); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 196;
    const menuHeight = 176;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    const top = window.innerHeight - rect.bottom >= menuHeight + 8 ? rect.bottom + 6 : Math.max(8, rect.top - menuHeight - 6);
    setOpenActions({ itemId, top, left });
  }

  const canReorder = !query.trim() && Boolean(categoryFilter);
  if (loading) return <main className={styles.page}><p role="status">Loading menu items…</p></main>;
  if (!currentUser) return <main className={styles.page}><p className={styles.error} role="alert">The admin session is unavailable.</p></main>;

  return <AdminShell username={currentUser.username} role={currentUser.role} title="Menu Management">
    <section className={styles.layout} aria-labelledby="menu-title">
      <div className={styles.intro}><div><p className={styles.eyebrow}>Kebab Gyros</p><h2 id="menu-title">Menu items</h2><p>Manage menu details, availability, and item order.</p></div></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}
      <section className={styles.toolbar} aria-label="Menu filters"><label>Search menu items<input placeholder="Search by name" value={query} onChange={(event) => setQuery(event.target.value)} disabled={busy}/></label><label>Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} disabled={busy}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><button disabled={busy} onClick={() => { setBusy(true); load().catch((reason) => setError(reason.message)).finally(() => setBusy(false)); }}>Search</button></section>
      <div className={styles.columns}>
        <form className={styles.form} onSubmit={save}><div><p className={styles.eyebrow}>Menu item</p><h3>{editing ? 'Edit item' : 'Add item'}</h3></div><label>Category<select value={form.categoryId} onChange={(event) => updateForm('categoryId', event.target.value)} required disabled={busy}><option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Name<input value={form.name} onChange={(event) => updateForm('name', event.target.value)} required disabled={busy}/></label><label>Description<textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} disabled={busy}/></label><label>Price<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateForm('price', event.target.value)} required disabled={busy}/></label><div className={styles.checks}><label><input type="checkbox" checked={form.isPopular} onChange={(event) => updateForm('isPopular', event.target.checked)} disabled={busy}/> Popular</label><label><input type="checkbox" checked={form.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} disabled={busy}/> Active</label></div><section className={styles.imagePanel} aria-labelledby="photo-title"><h4 id="photo-title">Item photo</h4>{editing?.imageUrl && <p className={styles.currentImage}>Current image saved.</p>}{!editing && <p className={styles.currentImage}>Optional: the selected photo is uploaded when the item is added.</p>}{preview && <img className={styles.preview} src={preview} alt="Selected replacement preview"/>}<label>Choose JPG, PNG, or WebP image (5 MB max)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => chooseFile(event.target.files?.[0] || null)}/></label>{editing && <button type="button" className={styles.secondary} disabled={busy || !file} onClick={uploadImage}>{busy ? 'Uploading…' : 'Upload and save photo'}</button>}</section><div className={styles.formActions}><button disabled={busy}>{busy ? (file && !editing ? 'Uploading photo…' : 'Saving…') : editing ? 'Save changes' : 'Add item'}</button>{editing && <button type="button" className={styles.secondary} disabled={busy} onClick={resetForm}>Cancel</button>}</div></form>
        <section className={styles.listPanel} aria-labelledby="item-list-title"><div className={styles.listHeading}><div><p className={styles.eyebrow}>Current menu</p><h3 id="item-list-title">Items</h3></div>{!canReorder && <p className={styles.reorderNote}>Select one category and clear search to reorder.</p>}</div>{items.length === 0 ? <p className={styles.empty}>No menu items match these filters.</p> : <div className={styles.tableWrap}><table><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map((item, index) => {
          const moveUpDisabled = busy || !canReorder || index === 0;
          const moveDownDisabled = busy || !canReorder || index === items.length - 1;
          const isActionsOpen = openActions?.itemId === item.id;
          const orderingHint = !canReorder ? 'Select one category and clear search to reorder.' : '';
          return <tr key={item.id}><td><strong>{item.name}</strong>{item.description && <span className={styles.description}>{item.description}</span>}</td><td><span className={styles.badge}>{item.categoryName}</span></td><td>${Number(item.price).toFixed(2)}</td><td><span className={`${styles.status} ${toBoolean(item.isActive) ? styles.active : styles.inactive}`}>{toBoolean(item.isActive) ? 'Active' : 'Inactive'}</span>{toBoolean(item.isPopular) && <span className={styles.popular}>Popular</span>}</td><td><button
            ref={(element) => { if (element) actionTriggerRefs.current.set(item.id, element); else actionTriggerRefs.current.delete(item.id); }}
            type="button"
            className={styles.actionsTrigger}
            aria-label={`Actions for ${item.name}`}
            aria-haspopup="true"
            aria-expanded={isActionsOpen}
            aria-controls={`item-actions-${item.id}`}
            disabled={busy}
            onClick={(event) => toggleActions(item.id, event)}
          >•••</button>{isActionsOpen && <div ref={actionMenuRef} id={`item-actions-${item.id}`} className={styles.actionsMenu} style={{ top: openActions.top, left: openActions.left }} aria-label={`Actions for ${item.name}`}>
            <button type="button" onClick={() => { setOpenActions(null); beginEdit(item); }}>Edit</button>
            <button type="button" disabled={moveUpDisabled} title={orderingHint || (index === 0 ? 'This is already the first item.' : undefined)} onClick={() => { setOpenActions(null); void move(index, -1); }}>Move up</button>
            <button type="button" disabled={moveDownDisabled} title={orderingHint || (index === items.length - 1 ? 'This is already the last item.' : undefined)} onClick={() => { setOpenActions(null); void move(index, 1); }}>Move down</button>
            {!canReorder && <p className={styles.menuHint}>{orderingHint}</p>}
            <button type="button" className={styles.delete} onClick={() => { setOpenActions(null); void removeItem(item); }}>Delete</button>
          </div>}</td></tr>;
        })}</tbody></table></div>}</section>
      </div>
    </section>
  </AdminShell>;
}
