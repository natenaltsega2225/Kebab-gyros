'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../../components/admin/AdminShell';
import styles from './page.module.css';

type User = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager';
  isActive: boolean | 0 | 1;
};

type CreateForm = Pick<User, 'email' | 'fullName' | 'role'> & { username: string };
type EditableUser = Omit<User, 'isActive'> & { isActive: boolean };
const blank: CreateForm = { username: '', email: '', fullName: '', role: 'manager' };

export default function Users() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [create, setCreate] = useState<CreateForm>(blank);
  const [edit, setEdit] = useState<EditableUser | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load(next = page) {
    const q = new URLSearchParams({ page: String(next), pageSize: '25' });
    if (search) q.set('search', search);
    if (role) q.set('role', role);
    if (status) q.set('status', status);
    const r = await fetch(`/api/admin/users?${q}`);
    const d = await r.json();
    if (!r.ok || !d.success) throw new Error(d.error || 'Unable to load users.');
    setUsers(d.data.users);
    setPages(d.data.pagination.totalPages || 1);
    setPage(next);
  }

  useEffect(() => {
    async function init() {
      try {
        const r = await fetch('/api/admin/session/me');
        const d = await r.json();
        if (!r.ok || !d.user) {
          router.replace('/admin');
          return;
        }
        if (d.user.mustChangePassword) {
          router.replace('/admin/change-password');
          return;
        }
        setMe(d.user);
        if (d.user.role !== 'admin') {
          setDenied(true);
          return;
        }
        await load(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load users.');
      } finally {
        setLoading(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(create),
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || 'Unable to create account.');
      setCreate(blank);
      await load(1);
      setSuccess(d.data.credentialDelivery === 'sent'
        ? 'Account created; credentials emailed.'
        : 'Account created; credential email failed.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create account.');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const previous = users.find(user => user.id === edit.id);
    if (previous?.isActive && !edit.isActive &&
      !window.confirm(`Deactivate ${edit.username}? Their active sessions will be revoked.`)) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const r = await fetch(`/api/admin/users/${edit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: edit.email,
          fullName: edit.fullName,
          role: edit.role,
          isActive: edit.isActive,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || 'Unable to update user.');
      setEdit(null);
      await load();
      setSuccess('User updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update user.');
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(user: User) {
    setEdit({ ...user, isActive: user.isActive === true || user.isActive === 1 });
  }

  async function deleteUser(user: User) {
    if (busy || user.id === me?.id) return;
    if (!window.confirm(`Permanently delete ${user.username}? This cannot be undone; their active sessions will end.`)) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const r = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || 'Unable to delete user.');
      if (edit?.id === user.id) setEdit(null);
      const next = users.length === 1 && page > 1 ? page - 1 : page;
      await load(next);
      setSuccess(`${user.username} deleted.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete user.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(user: User) {
    if (busy) return;
    if (!window.confirm(`Reset ${user.username}'s password? Their active sessions will be revoked and new temporary credentials emailed.`)) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const r = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || 'Unable to reset password.');
      await load();
      setSuccess(d.data.credentialDelivery === 'sent'
        ? `Password reset for ${user.username}; temporary credentials emailed and sessions revoked.`
        : `Password changed for ${user.username} and sessions revoked, but credential email delivery failed. Contact the backend administrator to restore access.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to reset password.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className={styles.page}><p role="status">Loading users…</p></main>;
  if (denied && me) return <AdminShell username={me.username} role={me.role} title="Admin Users"><section className={styles.accessDenied}><h2>Access denied</h2><p>User administration is available to administrators only.</p></section></AdminShell>;
  if (!me) return <main className={styles.page}><p className={styles.error} role="alert">The admin session is unavailable.</p></main>;

  return (
    <AdminShell username={me.username} role={me.role} title="Admin Users">
      <section className={styles.layout} aria-labelledby="users-title">
      <div className={styles.intro}><p className={styles.eyebrow}>Account administration</p><h2 id="users-title">Users</h2><p>Create and manage administrator and manager accounts.</p></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}
      <section className={styles.filters} aria-label="User filters">
        <label>Search<input aria-label="Search users" placeholder="Search by name, email, or username" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <label>Role<select aria-label="Filter by role" value={role} onChange={e => setRole(e.target.value)}>
          <option value="">All roles</option><option value="admin">Admin</option><option value="manager">Manager</option>
        </select></label>
        <label>Status<select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select></label>
        <button disabled={busy} onClick={() => load(1).catch(e => setError(e.message))}>Filter</button>
      </section>
      <div className={styles.columns}>
      <div className={styles.forms}>
      <form className={styles.form} onSubmit={createUser}>
        <div><p className={styles.eyebrow}>New account</p><h3>Create user</h3></div>
        <label>Username<input aria-label="Username" required disabled={busy} value={create.username} onChange={e => setCreate({ ...create, username: e.target.value })} /></label>
        <label>Email<input aria-label="Email" type="email" required disabled={busy} value={create.email} onChange={e => setCreate({ ...create, email: e.target.value })} /></label>
        <label>Full name<input aria-label="Full name" required disabled={busy} value={create.fullName} onChange={e => setCreate({ ...create, fullName: e.target.value })} /></label>
        <label>Role<select aria-label="New user role" disabled={busy} value={create.role}
          onChange={e => setCreate({ ...create, role: e.target.value as User['role'] })}>
          <option value="manager">Manager</option><option value="admin">Admin</option>
        </select></label>
        <button disabled={busy}>Create user</button>
      </form>
      {edit && <form className={styles.form} onSubmit={saveEdit}>
        <div><p className={styles.eyebrow}>Account details</p><h3>Edit {edit.username}</h3></div>
        <label>Email<input aria-label="Email" required type="email" disabled={busy} value={edit.email} onChange={e => setEdit({ ...edit, email: e.target.value })} /></label>
        <label>Full name<input aria-label="Full name" required disabled={busy} value={edit.fullName} onChange={e => setEdit({ ...edit, fullName: e.target.value })} /></label>
        <label>Role<select aria-label="Role" disabled={busy || me.id === edit.id} value={edit.role}
          onChange={e => setEdit({ ...edit, role: e.target.value as User['role'] })}>
          <option value="admin">Admin</option><option value="manager">Manager</option>
        </select></label>
        <label className={styles.checkbox}><input type="checkbox" disabled={busy || me.id === edit.id} checked={edit.isActive} onChange={e => setEdit({ ...edit, isActive: e.target.checked })} /> Active</label>
        <p className={styles.warning}>Deactivating an account revokes its active sessions.</p>
        <div className={styles.formActions}><button disabled={busy}>Save user</button><button type="button" className={styles.secondary} disabled={busy} onClick={() => setEdit(null)}>Cancel</button></div>
      </form>}
      </div>
      <section className={styles.listPanel} aria-labelledby="user-list-title"><div className={styles.listHeading}><div><p className={styles.eyebrow}>Directory</p><h3 id="user-list-title">Users</h3></div><p>{users.length} shown</p></div>
      {users.length === 0 ? <p className={styles.empty}>No users match these filters.</p> : <div className={styles.tableWrap}><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map(u => <tr key={u.id}>
        <td><strong>{u.fullName}</strong><span className={styles.userMeta}>{u.username} · {u.email}</span></td><td><span className={styles.roleBadge}>{u.role === 'admin' ? 'Admin' : 'Manager'}</span></td><td><span className={`${styles.statusBadge} ${u.isActive ? styles.active : styles.inactive}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>
        <div className={styles.actions}>
          <button disabled={busy} onClick={() => beginEdit(u)}>Edit</button>
          <button disabled={busy || !u.isActive} onClick={() => void resetPassword(u)}>Reset password</button>
          <button className={styles.delete} disabled={busy || u.id === me.id} onClick={() => void deleteUser(u)}>Delete</button>
        </div>
        </td>
      </tr>)}</tbody></table></div>}
      <div className={styles.pagination}><button disabled={page === 1 || busy} onClick={() => load(page - 1).catch(e => setError(e.message))}>Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages || busy} onClick={() => load(page + 1).catch(e => setError(e.message))}>Next</button></div>
      </section></div>
      </section>
    </AdminShell>
  );
}
