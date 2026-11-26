import { orderNumber } from './orders.js';

// Stripe Checkout through Stripe's REST API (no SDK needed).
// Returns null when STRIPE_SECRET_KEY is not set; the store then takes orders
// without online payment and the merchant marks them paid by hand.
export function createPayments({ secretKey, publicUrl }) {
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
      const { currency } = order;
      const form = {
        mode: 'payment',
        customer_email: order.customer.email,
        client_reference_id: String(orderNumber(order)),
        success_url: `${publicUrl}/orders/${order.token}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${publicUrl}/cart`
      };

      const lines = order.items.map((item) => ({
        name: item.variantTitle ? `${item.title} (${item.variantTitle})` : item.title,
        amount: item.price,
        quantity: item.quantity
      }));
      if (order.shipping.price > 0) lines.push({ name: `Shipping (${order.shipping.name})`, amount: order.shipping.price, quantity: 1 });
      if (order.tax > 0) lines.push({ name: 'Tax', amount: order.tax, quantity: 1 });
      lines.forEach((line, i) => {
        form[`line_items[${i}][quantity]`] = line.quantity;
        form[`line_items[${i}][price_data][currency]`] = currency;
        form[`line_items[${i}][price_data][unit_amount]`] = cents(line.amount);
        form[`line_items[${i}][price_data][product_data][name]`] = line.name;
      });

      // Our own discount codes become a single-use Stripe coupon for this
      // order, so the buyer sees the same discount on Stripe's page.
      if (order.discount?.amount > 0) {
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
