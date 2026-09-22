'use client';
import { useState } from 'react';
import type { Category, MenuItem } from '../lib/api/public';
import styles from './Menu.module.css';
export default function Menu({ categories, items }: { categories: Category[]; items: MenuItem[] }) {
  const [active, setActive] = useState(categories[0]?.slug || 'popular');
  const visible = items.filter((item) => active === 'popular' ? Boolean(item.isPopular) : item.categorySlug === active);
  return <div><div className={styles.tabs} role="tablist" aria-label="Menu categories">{categories.map((category) => <button key={category.slug} type="button" role="tab" aria-selected={active === category.slug} className={active === category.slug ? styles.selected : ''} onClick={() => setActive(category.slug)}>{category.name}</button>)}</div><div className={styles.grid} role="tabpanel" aria-live="polite">{visible.length ? visible.map((item) => <article key={item.id} className={styles.item}><div><h3>{item.name}</h3>{item.description && <p>{item.description}</p>}</div><strong>${Number(item.price).toFixed(2)}</strong></article>) : <p>{categories.length ? 'No items in this category yet.' : 'The menu is unavailable right now.'}</p>}</div></div>;
}
