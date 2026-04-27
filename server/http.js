const allowedPaymentMethods = new Set(['pix', 'card-delivery', 'cash']);

export function sendError(res, error) {
  const statusCode = Number(error.statusCode) || 500;
  const message = statusCode >= 500 ? 'Erro interno no servidor.' : error.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({ error: message });
}

export function normalizeOrderPayload(body) {
  const customer = {
    name: String(body?.customer?.name ?? '').trim(),
    email: String(body?.customer?.email ?? '').trim().toLowerCase(),
    phone: String(body?.customer?.phone ?? '').trim(),
    address: String(body?.customer?.address ?? '').trim(),
    city: String(body?.customer?.city ?? '').trim(),
    state: String(body?.customer?.state ?? '').trim().toUpperCase(),
    zip: String(body?.customer?.zip ?? '').trim(),
    paymentMethod: String(body?.customer?.paymentMethod ?? '').trim(),
    deliveryNotes: String(body?.customer?.deliveryNotes ?? '').trim(),
  };
  const items = Array.isArray(body?.items) ? body.items : [];

  const requiredFields = [
    ['nome', customer.name],
    ['email', customer.email],
    ['telefone', customer.phone],
    ['endereço', customer.address],
    ['cidade', customer.city],
    ['estado', customer.state],
    ['CEP', customer.zip],
  ];

  const missingField = requiredFields.find(([, value]) => !value);

  if (missingField) {
    const error = new Error(`Preencha o campo ${missingField[0]}.`);
    error.statusCode = 400;
    throw error;
  }

  if (!customer.email.includes('@')) {
    const error = new Error('Informe um email válido.');
    error.statusCode = 400;
    throw error;
  }

  if (!allowedPaymentMethods.has(customer.paymentMethod)) {
    const error = new Error('Escolha uma forma de pagamento válida.');
    error.statusCode = 400;
    throw error;
  }

  return {
    customer,
    items: items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    })),
  };
}
