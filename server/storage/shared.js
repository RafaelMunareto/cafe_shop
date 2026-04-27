export function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

export function createOrderNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(2, 14);
  const suffix = Math.floor(100 + Math.random() * 900);

  return `CAF${stamp}${suffix}`;
}
