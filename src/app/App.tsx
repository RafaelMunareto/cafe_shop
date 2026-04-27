import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Coffee,
  LoaderCircle,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
} from 'lucide-react';

import { fetchProducts, submitOrder } from './api';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import type { CartItem, CheckoutForm, OrderConfirmation, PaymentMethod, Product } from './types';

const initialCheckout: CheckoutForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  paymentMethod: 'pix',
  deliveryNotes: '',
};

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getCartQuantity(cartItems: CartItem[], product: Product) {
  return cartItems.find((item) => item.id === product.id)?.quantity ?? 0;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [roasts, setRoasts] = useState<string[]>(['all']);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoast, setSelectedRoast] = useState('all');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkout, setCheckout] = useState<CheckoutForm>(initialCheckout);
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoadingProducts(true);
      setLoadError('');

      try {
        const response = await fetchProducts(
          {
            search: searchTerm,
            roast: selectedRoast,
          },
          controller.signal,
        );

        setProducts(response.products);
        setRoasts(['all', ...response.filters.roasts]);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar o catálogo.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingProducts(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [reloadKey, searchTerm, selectedRoast]);

  const totals = useMemo(() => {
    const subtotal = Number(
      cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2),
    );
    const shipping = cartItems.length === 0 ? 0 : subtotal >= 100 ? 0 : 15.9;
    const total = Number((subtotal + shipping).toFixed(2));

    return { subtotal, shipping, total };
  }, [cartItems]);

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(product: Product) {
    setCartItems((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: number, delta: number) {
    setCartItems((current) =>
      current
        .map((item) =>
          item.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(productId: number) {
    setCartItems((current) => current.filter((item) => item.id !== productId));
  }

  function updateCheckout(field: keyof CheckoutForm, value: string) {
    setCheckout((current) => ({
      ...current,
      [field]: value as CheckoutForm[typeof field],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cartItems.length === 0) {
      setSubmitError('Adicione pelo menos um café ao carrinho antes de finalizar.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const confirmation = await submitOrder({
        customer: checkout,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      setOrder(confirmation);
      setCartItems([]);
      setCheckout(initialCheckout);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível concluir o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.25),_transparent_30%),linear-gradient(180deg,_#fff9f0_0%,_#f7f0e6_45%,_#efe3d3_100%)] text-stone-900">
      <header className="border-b border-amber-950/10 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#7c2d12,_#d97706)] shadow-lg shadow-amber-900/20">
                <Coffee className="h-7 w-7 text-amber-50" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-amber-700">Cafe Shop</p>
                <h1 className="text-3xl text-stone-950">API JavaScript + SQLite funcional</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700">
                Catálogo em banco
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-amber-700">
                Pedidos persistidos
              </span>
              <span className="rounded-full border border-stone-200 bg-white px-4 py-2 text-stone-700">
                {itemCount} item(ns) no carrinho
              </span>
            </div>
          </div>

          <section className="grid gap-6 rounded-[2rem] bg-[linear-gradient(135deg,_rgba(68,29,9,0.98),_rgba(120,53,15,0.96),_rgba(180,83,9,0.92))] px-6 py-8 text-amber-50 shadow-2xl shadow-amber-950/20 lg:grid-cols-[1.4fr_0.9fr] lg:px-10">
            <div className="space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-amber-100">
                <ShieldCheck className="h-4 w-4" />
                API em JavaScript rodando separada do frontend
              </p>
              <div className="space-y-3">
                <h2 className="max-w-2xl text-4xl leading-tight text-white sm:text-5xl">
                  Loja de café conectada em uma API real com persistência local.
                </h2>
                <p className="max-w-2xl text-lg leading-8 text-amber-100/90">
                  O catálogo sai do componente React e passa a vir do banco. O checkout grava o pedido
                  no SQLite e devolve confirmação com número de ordem.
                </p>
              </div>
              <div className="flex flex-wrap gap-5 text-sm text-amber-100/90">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  8 origens cadastradas no banco
                </div>
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4" />
                  Frete grátis acima de R$ 100
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Checkout persistente via POST
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-black/10 p-5 backdrop-blur-sm sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm text-amber-100/80">Produtos carregados</p>
                <p className="mt-3 text-3xl text-white">{isLoadingProducts ? '...' : products.length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm text-amber-100/80">Perfis de torra</p>
                <p className="mt-3 text-3xl text-white">{Math.max(roasts.length - 1, 0)}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm text-amber-100/80">Total do carrinho</p>
                <p className="mt-3 text-3xl text-white">{formatPrice(totals.total)}</p>
              </div>
            </div>
          </section>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[1fr_370px] lg:items-start lg:px-8">
        <section className="space-y-8">
          {order && (
            <div className="rounded-[2rem] border border-emerald-200 bg-[linear-gradient(135deg,_#ecfdf5,_#f0fdf4)] p-6 shadow-lg shadow-emerald-950/5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-emerald-700">Pedido confirmado</p>
                  <h2 className="mt-2 text-3xl text-emerald-950">#{order.orderNumber}</h2>
                  <p className="mt-2 max-w-2xl text-emerald-900/80">
                    Pedido salvo no banco em {formatDateTime(order.createdAt)} com total de{' '}
                    {formatPrice(order.total)}.
                  </p>
                </div>
                <div className="rounded-3xl border border-emerald-200 bg-white px-5 py-4 text-sm text-emerald-900">
                  Pagamento:{' '}
                  {order.customer.paymentMethod === 'pix'
                    ? 'Pix'
                    : order.customer.paymentMethod === 'cash'
                      ? 'Dinheiro'
                      : 'Cartão na entrega'}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-amber-950/5 backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl text-stone-950">Catálogo</h2>
                <p className="text-stone-600">
                  Busca pela API com filtro de torra e dados vindos do banco.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="relative block min-w-[260px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nome, origem ou descrição"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-amber-500 focus:bg-white"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {roasts.map((roast) => (
                    <button
                      key={roast}
                      type="button"
                      onClick={() => setSelectedRoast(roast)}
                      className={`rounded-2xl px-4 py-3 text-sm transition ${
                        selectedRoast === roast
                          ? 'bg-stone-950 text-white shadow-lg shadow-stone-950/10'
                          : 'border border-stone-200 bg-white text-stone-700 hover:border-amber-400 hover:text-amber-700'
                      }`}
                    >
                      {roast === 'all' ? 'Todos' : roast}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {loadError ? (
            <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-lg shadow-rose-950/5">
              <p className="text-lg">Falha ao carregar a API.</p>
              <p className="mt-2 text-sm text-rose-800/80">{loadError}</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-4 rounded-2xl bg-rose-900 px-4 py-2 text-sm text-white"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {isLoadingProducts
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 shadow-xl shadow-amber-950/5"
                  >
                    <div className="h-56 animate-pulse bg-stone-200" />
                    <div className="space-y-4 p-6">
                      <div className="h-6 w-2/3 animate-pulse rounded-full bg-stone-200" />
                      <div className="h-4 w-1/3 animate-pulse rounded-full bg-stone-200" />
                      <div className="h-16 animate-pulse rounded-3xl bg-stone-100" />
                    </div>
                  </div>
                ))
              : products.map((product) => {
                  const quantity = getCartQuantity(cartItems, product);

                  return (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 shadow-xl shadow-amber-950/5 transition hover:-translate-y-1 hover:shadow-2xl"
                    >
                      <div className="relative">
                        <ImageWithFallback
                          src={product.image}
                          alt={product.name}
                          className="h-60 w-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute left-5 top-5 inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1 text-sm text-white backdrop-blur-sm">
                          <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                          {product.rating.toFixed(1)}
                        </div>
                      </div>

                      <div className="space-y-4 p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-2xl text-stone-950">{product.name}</h3>
                            <p className="mt-1 flex items-center gap-2 text-sm text-stone-500">
                              <MapPin className="h-4 w-4" />
                              {product.origin}
                            </p>
                          </div>
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-800">
                            {product.roast}
                          </span>
                        </div>

                        <p className="min-h-16 text-sm leading-6 text-stone-600">{product.description}</p>

                        <div className="flex flex-wrap gap-2">
                          {product.notes.map((note) => (
                            <span
                              key={note}
                              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600"
                            >
                              {note}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between gap-4 pt-2">
                          <div>
                            <p className="text-2xl text-stone-950">{formatPrice(product.price)}</p>
                            <p className="text-sm text-stone-500">{product.weight}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => addToCart(product)}
                            className="rounded-2xl bg-[linear-gradient(135deg,_#7c2d12,_#d97706)] px-5 py-3 text-sm text-white shadow-lg shadow-amber-950/15 transition hover:brightness-105"
                          >
                            {quantity > 0 ? `Adicionar mais (${quantity})` : 'Adicionar'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
          </div>

          {!isLoadingProducts && products.length === 0 && !loadError ? (
            <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white/75 p-10 text-center text-stone-600">
              Nenhum café encontrado para a busca atual.
            </div>
          ) : null}
        </section>

        <aside className="space-y-6 lg:sticky lg:top-6">
          <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-xl shadow-amber-950/5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl text-stone-950">Carrinho</h2>
                <p className="text-sm text-stone-500">{itemCount} unidade(s)</p>
              </div>
              <ShoppingBag className="h-5 w-5 text-amber-700" />
            </div>

            <div className="mt-5 space-y-4">
              {cartItems.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
                  Seu carrinho está vazio.
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-stone-200 bg-stone-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base text-stone-950">{item.name}</h3>
                        <p className="text-sm text-stone-500">{formatPrice(item.price)} por pacote</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-full p-2 text-stone-500 transition hover:bg-white hover:text-rose-600"
                        aria-label={`Remover ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2 py-1">
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.id, -1)}
                          className="rounded-full p-1 text-stone-700 hover:bg-stone-100"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-8 text-center text-sm text-stone-950">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.id, 1)}
                          className="rounded-full p-1 text-stone-700 hover:bg-stone-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="text-lg text-stone-950">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 space-y-3 rounded-3xl bg-stone-950 p-5 text-sm text-stone-200">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Frete</span>
                <span>
                  {totals.shipping === 0 && cartItems.length > 0
                    ? 'Grátis'
                    : formatPrice(totals.shipping)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-lg text-white">
                <span>Total</span>
                <span>{formatPrice(totals.total)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-xl shadow-amber-950/5">
            <div>
              <h2 className="text-2xl text-stone-950">Finalizar pedido</h2>
              <p className="text-sm text-stone-500">
                Os dados abaixo são enviados para a API e gravados no banco local.
              </p>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <input
                type="text"
                value={checkout.name}
                onChange={(event) => updateCheckout('name', event.target.value)}
                placeholder="Nome completo"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white"
              />
              <input
                type="email"
                value={checkout.email}
                onChange={(event) => updateCheckout('email', event.target.value)}
                placeholder="Email"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white"
              />
              <input
                type="tel"
                value={checkout.phone}
                onChange={(event) => updateCheckout('phone', event.target.value)}
                placeholder="Telefone"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white"
              />
              <input
                type="text"
                value={checkout.address}
                onChange={(event) => updateCheckout('address', event.target.value)}
                placeholder="Endereço"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white"
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <input
                  type="text"
                  value={checkout.city}
                  onChange={(event) => updateCheckout('city', event.target.value)}
                  placeholder="Cidade"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white"
                />
                <input
                  type="text"
                  maxLength={2}
                  value={checkout.state}
                  onChange={(event) => updateCheckout('state', event.target.value)}
                  placeholder="UF"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm uppercase outline-none transition focus:border-amber-500 focus:bg-white"
                />
                <input
                  type="text"
                  value={checkout.zip}
                  onChange={(event) => updateCheckout('zip', event.target.value)}
                  placeholder="CEP"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white"
                />
              </div>

              <select
                value={checkout.paymentMethod}
                onChange={(event) =>
                  updateCheckout('paymentMethod', event.target.value as PaymentMethod)
                }
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white"
              >
                <option value="pix">Pix</option>
                <option value="card-delivery">Cartão na entrega</option>
                <option value="cash">Dinheiro</option>
              </select>

              <textarea
                value={checkout.deliveryNotes}
                onChange={(event) => updateCheckout('deliveryNotes', event.target.value)}
                placeholder="Observações de entrega"
                rows={4}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white"
              />

              {submitError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {submitError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,_#7c2d12,_#d97706)] px-5 py-4 text-white shadow-lg shadow-amber-950/15 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
                {isSubmitting ? 'Enviando para a API...' : 'Salvar pedido no banco'}
              </button>
            </form>
          </section>
        </aside>
      </main>
    </div>
  );
}
