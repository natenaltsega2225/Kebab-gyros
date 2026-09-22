export type Category = { id: number | string; name: string; slug: string; sortOrder: number };
export type MenuItem = { id: number; name: string; description: string | null; price: number | string; imageUrl: string | null; isPopular: number | boolean; categorySlug: string };
export type Restaurant = { restaurantName: string; addressLine1: string; city: string; state: string; zipCode: string; phone: string | null; email: string | null; googleMapsUrl: string | null; orderOnlineUrl: string | null; logoUrl: string | null };
export type Hours = { dayOfWeek: number; isClosed: number | boolean; openTime: string | null; closeTime: string | null };
const base = process.env.API_BASE_URL || 'http://localhost:4000';
async function read<T>(path: string): Promise<T> {
  const response = await fetch(`${base}/api/${path}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`API ${path}: ${response.status}`);
  const body: { success: boolean; data: T; error?: string } = await response.json();
  if (!body.success) throw new Error(body.error || `API ${path} failed`);
  return body.data;
}
export async function getPublicData() {
  const results = await Promise.allSettled([read<Category[]>('menu/categories'), read<MenuItem[]>('menu/items'), read<Restaurant | null>('restaurant'), read<Hours[]>('hours')]);
  return {
    categories: results[0].status === 'fulfilled' ? results[0].value : [],
    items: results[1].status === 'fulfilled' ? results[1].value : [],
    restaurant: results[2].status === 'fulfilled' ? results[2].value : null,
    hours: results[3].status === 'fulfilled' ? results[3].value : [],
    error: results.some((r) => r.status === 'rejected'),
  };
}
