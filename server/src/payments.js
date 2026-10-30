// Stripe Checkout through Stripe's REST API (no SDK needed).
// Returns null when STRIPE_SECRET_KEY is not set; the shop then takes orders
// without online payment and the artist invoices the buyer by hand.
export function createPayments({ secretKey, currency, publicUrl }) {
  if (!secretKey) return null;

  async function stripe(path, { method = 'GET', form } = {}) {
    const response = await fetch(`https://api.stripe.com/v1/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        ...(form && { 'Content-Type': 'application/x-www-form-urlencoded' })
      },
      body: form && new URLSearchParams(form)
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message || 'Stripe request failed');
    return json;
  }

  return {
    createCheckoutSession(order) {
      const form = {
        mode: 'payment',
        customer_email: order.email,
        client_reference_id: String(order.id),
        success_url: `${publicUrl}/order/${order.token}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${publicUrl}/cart`
      };
      order.items.forEach((item, i) => {
        form[`line_items[${i}][quantity]`] = item.quantity;
        form[`line_items[${i}][price_data][currency]`] = currency;
        form[`line_items[${i}][price_data][unit_amount]`] = Math.round(item.price * 100);
        form[`line_items[${i}][price_data][product_data][name]`] = item.title;
      });
      return stripe('checkout/sessions', { method: 'POST', form });
    },

    getCheckoutSession: (id) => stripe(`checkout/sessions/${encodeURIComponent(id)}`)
  };
}
