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

  const cents = (amount) => Math.round(amount * 100);

  return {
    async createCheckoutSession(order) {
      const form = {
        mode: 'payment',
        customer_email: order.email,
        client_reference_id: String(order.id),
        success_url: `${publicUrl}/order/${order.token}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${publicUrl}/cart`
      };

      const lines = order.items.map((item) => ({ name: item.title, amount: item.price, quantity: item.quantity }));
      if (order.shipping > 0) lines.push({ name: 'Shipping', amount: order.shipping, quantity: 1 });
      lines.forEach((line, i) => {
        form[`line_items[${i}][quantity]`] = line.quantity;
        form[`line_items[${i}][price_data][currency]`] = currency;
        form[`line_items[${i}][price_data][unit_amount]`] = cents(line.amount);
        form[`line_items[${i}][price_data][product_data][name]`] = line.name;
      });

      // Our own discount codes become a single-use Stripe coupon for this order,
      // so the buyer sees the same discount on Stripe's page.
      if (order.discount) {
        const coupon = await stripe('coupons', {
          method: 'POST',
          form: { amount_off: cents(order.discount.amount), currency, duration: 'once', max_redemptions: 1, name: order.discount.code }
        });
        form['discounts[0][coupon]'] = coupon.id;
      }

      return stripe('checkout/sessions', { method: 'POST', form });
    },

    getCheckoutSession: (id) => stripe(`checkout/sessions/${encodeURIComponent(id)}`)
  };
}
