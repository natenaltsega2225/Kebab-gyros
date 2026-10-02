'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) { setError('Password reset link is invalid or expired.'); return; }
    if (password !== confirm) { setError('New password confirmation does not match.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/session/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword: password }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Password reset link is invalid or expired.');
      setPassword(''); setConfirm(''); setSuccess('Password reset. Returning to sign in…'); router.replace('/admin');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to reset password.'); }
    finally { setBusy(false); }
  }

  if (!token) return <main className={styles.page}><p>Password reset link is invalid or expired.</p></main>;
  return <main className={styles.page}><form onSubmit={submit}><h1>Reset password</h1><p>Use 12+ characters with uppercase, lowercase, number, and symbol.</p><label htmlFor="reset-password">New Password</label><div className={styles.passwordField}><input id="reset-password" name="newPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={`${showPassword ? 'Hide' : 'Show'} new password`} aria-pressed={showPassword} disabled={busy}>{showPassword ? 'Hide' : 'Show'}</button></div><label htmlFor="reset-password-confirmation">Confirm Password</label><div className={styles.passwordField}><input id="reset-password-confirmation" name="confirmNewPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" minLength={12} value={confirm} onChange={(event) => setConfirm(event.target.value)} required disabled={busy} /><button type="button" onClick={() => setShowConfirm((visible) => !visible)} aria-label={`${showConfirm ? 'Hide' : 'Show'} password confirmation`} aria-pressed={showConfirm} disabled={busy}>{showConfirm ? 'Hide' : 'Show'}</button></div>{error && <p role="alert">{error}</p>}{success && <p role="status">{success}</p>}<button disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</button></form></main>;
}

export default function ResetPassword() {
  return <Suspense fallback={<main className={styles.page}><p role="status">Loading reset link…</p></main>}><ResetForm /></Suspense>;
}
