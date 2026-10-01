'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminShell.module.css';

type AdminShellProps = { username: string; role: string; title: string; children: ReactNode };
type NavigationLink = readonly [href: string, label: string, icon: IconName];
type IconName = 'dashboard' | 'menu' | 'categories' | 'restaurant' | 'hours' | 'users' | 'audit';

const links: NavigationLink[] = [
  ['/admin/dashboard', 'Dashboard', 'dashboard'],
  ['/admin/menu', 'Menu Management', 'menu'],
  ['/admin/categories', 'Categories', 'categories'],
  ['/admin/restaurant', 'Restaurant Settings', 'restaurant'],
  ['/admin/hours', 'Working Hours', 'hours'],
];

function NavigationIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    menu: <><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    categories: <><path d="M4 5h7l2 2h7v12H4z"/><path d="M4 5v14"/></>,
    restaurant: <><path d="M4 21V9l8-5 8 5v12"/><path d="M9 21v-6h6v6M8 10h.01M16 10h.01"/></>,
    hours: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.8-3.3 2.8-5 5.5-5s4.7 1.7 5.5 5M16 10c2.5 0 4.2 1.7 4.5 4M16 5.5a3 3 0 0 1 0 5.7"/></>,
    audit: <><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></>,
  };
  return <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function AdminShell({ username, role, title, children }: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const adminLinks: NavigationLink[] = role === 'admin' ? [['/admin/users', 'Admin Users', 'users'], ['/admin/audit-logs', 'Audit Logs', 'audit']] : [];

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);

  useEffect(() => { if (open) sidebarRef.current?.querySelector<HTMLAnchorElement>('a')?.focus(); }, [open]);

  return <div className={styles.shell}>
    <button ref={toggleRef} className={styles.menuButton} aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} onClick={() => setOpen((wasOpen) => !wasOpen)}>☰</button>
    {open && <button className={styles.backdrop} aria-label="Close navigation menu" onClick={() => setOpen(false)}/>}
    <aside ref={sidebarRef} className={`${styles.sidebar} ${open ? styles.open : ''}`}>
      <div className={styles.brand}>Kebab Gyros<small>Admin portal</small></div>
      <nav aria-label="Admin navigation" className={styles.nav}>{[...links, ...adminLinks].map(([href, label, icon]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={pathname === href ? styles.current : ''}><NavigationIcon name={icon}/><span>{label}</span></Link>)}</nav>
    </aside>
    <div className={styles.main}>
      <header className={styles.header}><div><p className={styles.breadcrumb}>Admin / {title}</p><h1>{title}</h1></div><div className={styles.profile}><span className={styles.initials}>{username.slice(0, 2).toUpperCase()}</span><span><strong>{username}</strong><small>{role === 'admin' ? 'Admin' : 'Manager'}</small></span><form action="/api/admin/session/logout" method="post"><button className={styles.logout}>Log out</button></form></div></header>
      <main className={styles.content}>{children}</main>
    </div>
  </div>;
}
