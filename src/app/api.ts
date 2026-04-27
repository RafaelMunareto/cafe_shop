import type { CheckoutForm, OrderConfirmation, ProductResponse } from './types';

const API_BASE = '/api';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || 'Falha ao se comunicar com a API.');
  }

  return data as T;
}

export async function fetchProducts(
  params: { search?: string; roast?: string },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set('search', params.search.trim());
  }

  if (params.roast && params.roast !== 'all') {
    query.set('roast', params.roast);
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';

  return requestJson<ProductResponse>(`${API_BASE}/products${suffix}`, { signal });
}

export async function submitOrder(payload: {
  customer: CheckoutForm;
  items: Array<{ productId: number; quantity: number }>;
}) {
  return requestJson<OrderConfirmation>(`${API_BASE}/orders`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
