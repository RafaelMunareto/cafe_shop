export type PaymentMethod = 'pix' | 'card-delivery' | 'cash';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  origin: string;
  roast: string;
  rating: number;
  weight: string;
  notes: string[];
  featured: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface CheckoutForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  paymentMethod: PaymentMethod;
  deliveryNotes: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderConfirmation {
  orderNumber: string;
  createdAt: string;
  status: string;
  subtotal: number;
  shipping: number;
  total: number;
  customer: CheckoutForm;
  items: OrderItem[];
}

export interface ProductResponse {
  products: Product[];
  filters: {
    roasts: string[];
  };
}
