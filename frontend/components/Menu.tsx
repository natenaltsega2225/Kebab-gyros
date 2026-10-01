'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Category, MenuItem } from '../lib/api/public';
import styles from './Menu.module.css';

function publicImageUrl(value: string): string | null {
  const imageUrl = value.trim();
  if (!imageUrl) return null;
  if (imageUrl.startsWith('/')) return imageUrl;

  try {
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function Menu({ categories, items }: { categories: Category[]; items: MenuItem[] }) {
  const [active, setActive] = useState(categories[0]?.slug || 'popular');
  const visible = items.filter((item) => active === 'popular' ? Boolean(item.isPopular) : item.categorySlug === active);

  return (
    <div>
      <div className={styles.tabs} role="tablist" aria-label="Menu categories">
        {categories.map((category) => (
          <button key={category.slug} type="button" role="tab" aria-selected={active === category.slug} className={active === category.slug ? styles.selected : ''} onClick={() => setActive(category.slug)}>
            {category.name}
          </button>
        ))}
      </div>
      <div className={styles.grid} role="tabpanel" aria-live="polite">
        {visible.length ? visible.map((item) => {
          const imageUrl = item.imageUrl ? publicImageUrl(item.imageUrl) : null;
          return (
            <article key={item.id} className={styles.item}>
              {imageUrl && <Image className={styles.image} src={imageUrl} alt={item.name} width={160} height={120} unoptimized />}
              <div><h3>{item.name}</h3>{item.description && <p>{item.description}</p>}</div>
              <strong>${Number(item.price).toFixed(2)}</strong>
            </article>
          );
        }) : <p>{categories.length ? 'No items in this category yet.' : 'The menu is unavailable right now.'}</p>}
      </div>
    </div>
  );
}
