'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
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
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const visible = items.filter((item) => active === 'popular' ? Boolean(item.isPopular) : item.categorySlug === active);
  const tabPanelId = 'menu-category-panel';

  function tabId(slug: string) {
    return `menu-category-tab-${slug}`;
  }

  function selectTab(slug: string, focus = false) {
    setActive(slug);

    if (focus) {
      requestAnimationFrame(() => {
        const tab = tabRefs.current.get(slug);
        tab?.focus({ preventScroll: true });
        tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    }
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!categories.length) return;

    let nextIndex: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % categories.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + categories.length) % categories.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = categories.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectTab(categories[nextIndex].slug, true);
  }

  return (
    <div>
      <div className={styles.tabs} role="tablist" aria-label="Menu categories">
        {categories.map((category, index) => (
          <button
            key={category.slug}
            ref={(node) => {
              if (node) tabRefs.current.set(category.slug, node);
              else tabRefs.current.delete(category.slug);
            }}
            id={tabId(category.slug)}
            type="button"
            role="tab"
            aria-controls={tabPanelId}
            aria-selected={active === category.slug}
            tabIndex={active === category.slug ? 0 : -1}
            className={active === category.slug ? styles.selected : ''}
            onClick={() => selectTab(category.slug)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div id={tabPanelId} className={styles.grid} role="tabpanel" aria-labelledby={tabId(active)} aria-live="polite">
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
