import Image from 'next/image';
import { getPublicData } from '../lib/api/public';
import Menu from '../components/Menu';
import styles from './page.module.css';

const fallbackOrderUrl = 'https://online.skytab.com/s/kebabgyronashville?referralSource=skytabwebsite&referralGuid=755bb0ba-2f51-48f0-b131-d9ba3fb72b1f&stw_domain=kebabgyronashville.com';
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type RestaurantWithAddressLine2 = { addressLine2?: string | null };

function displayTime(value: string | null) {
  if (!value) return '';
  const [hourText, minute] = value.split(':');
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

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

function logoImageUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const logoUrl = value.trim();
  if (logoUrl.startsWith('/')) return logoUrl;
  try {
    const url = new URL(logoUrl);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const { categories, items, restaurant, hours, error } = await getPublicData();
  const restaurantName = restaurant?.restaurantName?.trim() || 'Kebab Gyros';
  const addressLine2 = (restaurant as (typeof restaurant & RestaurantWithAddressLine2) | null)?.addressLine2?.trim();
  const address = restaurant ? [restaurant.addressLine1, addressLine2, `${restaurant.city}, ${restaurant.state} ${restaurant.zipCode}`].filter(Boolean).join(', ') : '389 Murfreesboro Pike, Nashville, TN 37210';
  const directions = restaurant?.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  const orderUrl = restaurant?.orderOnlineUrl || fallbackOrderUrl;
  const phone = restaurant?.phone?.trim() || null;
  const logoUrl = logoImageUrl(restaurant?.logoUrl);
  const photos = ['/food/combo-plate.jpg', '/food/gyro-sandwich.jpg', '/food/baklava.jpg'];
  const favorites = items.filter((item) => Boolean(item.isPopular)).slice(0, 3);
  const order = (label: string) => <a className={styles.order} href={orderUrl} target="_blank" rel="noopener noreferrer">{label}</a>;
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;

  return <>
    <header className={styles.header}><div className={styles.wrap}>
      <a href="#top" className={styles.brand}>{logoUrl ? <Image className={styles.logo} src={logoUrl} alt="" width={42} height={42} unoptimized /> : <span aria-hidden="true">✦</span>}<span>{restaurantName}<small>Greek & Italian Eatery</small></span></a>
      <nav aria-label="Main navigation"><a href="#featured">Favorites</a><a href="#menu">Menu</a><a href="#about">About</a><a href="#visit">Visit</a>{order('Order Now')}</nav><a className={styles.mobileNav} href="#menu">Browse menu</a>
    </div></header>
    <main id="top">
      <section className={styles.hero}><Image src="/food/mediterranean-hero.jpg" alt="Fresh Mediterranean plate with pita and vegetables" fill priority sizes="100vw" className={styles.heroPhoto} /><div className={styles.heroOverlay} /><div className={styles.heroText}><p className={styles.eyebrow}>Fresh Mediterranean Flavor in Nashville</p><h1>Authentic Gyros, Kebabs & Italian Favorites</h1><p>Freshly prepared plates, sandwiches, pasta, salads, and more—ready for dine-in, takeout, or convenient online ordering.</p><div className={styles.actions}>{order('Order Now')}<a className={styles.outline} href="#menu">Explore the Menu</a></div><p className={styles.address}>⌖ {address}</p></div></section>
      <section id="featured" className={styles.section}><div className={styles.wrap}><p className={styles.eyebrow}>Customer favorites</p><h2>Made fresh. Served generous.</h2><p className={styles.lead}>Comforting Mediterranean classics prepared for a quick lunch, an easy dinner, or takeout on the way home.</p><div className={styles.cards}>{favorites.map((item, index) => { const imageUrl = item.imageUrl ? publicImageUrl(item.imageUrl) : null; return <article className={styles.card} key={item.id}><Image src={imageUrl || photos[index]} alt={item.name} width={600} height={440} unoptimized={Boolean(imageUrl)} /><div><h3>{item.name}</h3><strong>${Number(item.price).toFixed(2)}</strong></div></article>; })}</div>{!favorites.length && <p className={styles.notice}>Favorites will appear here when the menu is available.</p>}<div className={styles.center}>{order('Start Your Order')}</div></div></section>
      <section id="menu" className={`${styles.section} ${styles.warm}`}><div className={styles.wrap}><p className={styles.eyebrow}>Our menu</p><h2>Find your favorite</h2>{error ? <p className={styles.notice}>The live menu is temporarily unavailable. Please use online ordering for current items and prices.</p> : <Menu categories={categories} items={items} />}<p className={styles.disclaimer}>Menu items and prices are subject to change.</p><div className={styles.center}>{order('Order from the Full Menu')}</div></div></section>
      <section id="about" className={styles.section}><div className={styles.wrap}><p className={styles.eyebrow}>Greek & Italian Eatery</p><h2>Fresh food for your Nashville day.</h2><p className={styles.lead}>Stop in for generous Mediterranean plates, sandwiches, and Italian favorites. Enjoy a quick meal or order ahead for pickup.</p><div className={styles.gallery}>{photos.map((photo, index) => <Image key={photo} src={photo} alt={['Combo plate', 'Gyro sandwich', 'Baklava'][index]} width={480} height={330} />)}</div></div></section>
      <section id="visit" className={`${styles.section} ${styles.visit}`}><div className={styles.wrap}><p className={styles.eyebrow}>Visit us</p><h2>Your neighborhood stop for fresh Mediterranean flavor</h2><div className={styles.visitCard}><div><h3>Find us</h3><p>{address}</p>{phone && phoneHref && <a className={styles.phone} href={phoneHref}>{phone}</a>}<div className={styles.actions}><a className={styles.outline} href={directions} target="_blank" rel="noopener noreferrer">Get Directions</a>{order('Order Online')}</div><a className={styles.map} href={directions} target="_blank" rel="noopener noreferrer">⌖ {restaurantName}, Nashville ↗</a></div><div><h3>Business Hours</h3><dl>{days.map((day, i) => { const entry = hours.find((hour) => Number(hour.dayOfWeek) === i); return <div className={styles.hour} key={day}><dt>{day}</dt><dd>{entry ? entry.isClosed ? 'Closed' : `${displayTime(entry.openTime)}–${displayTime(entry.closeTime)}` : 'Hours unavailable'}</dd></div>; })}</dl></div></div></div></section>
      <section className={`${styles.section} ${styles.warm}`}><div className={styles.wrap}><div className={styles.center}><h2>Fresh food is just a few clicks away.</h2><p className={styles.lead}>Browse the full online menu and place your order for convenient pickup.</p>{order('Start Your Order')}</div></div></section>
    </main>
    <footer className={styles.footer}><div className={styles.wrap}><div className={styles.footerGrid}><div><h2>{restaurantName}</h2><p>Greek & Italian Eatery</p><p>Greek and Italian favorites served on Murfreesboro Pike in Nashville.</p></div><div><h3>Quick Links</h3><a href="#top">Home</a><a href="#featured">Favorites</a><a href="#menu">Menu</a><a href="#visit">Visit Us</a></div><div><h3>Visit</h3><p>{address}</p>{phone && phoneHref && <a href={phoneHref}>{phone}</a>}<a href={`mailto:${restaurant?.email || 'kg_negash@yahoo.com'}`}>{restaurant?.email || 'kg_negash@yahoo.com'}</a></div><div><h3>Ordering</h3>{order('Order Online')}</div></div><p className={styles.copyright}>© {new Date().getFullYear()} {restaurantName}. Online ordering powered by SkyTab.</p></div></footer><div className={styles.sticky}>{order('Order Now')}</div>
  </>;
}
