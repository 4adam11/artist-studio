import nodemailer from 'nodemailer';
import { orderNumber } from './orders.js';

// Sends emails when SMTP settings are configured: notifications to the
// merchant and confirmations to customers. Without SMTP, each email is just
// logged, and everything can still be read in the admin.
export function createMailer({ smtp, notifyEmail, fromEmail, publicUrl }, getStoreName = () => 'Our store') {
  const transport = smtp.host
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined
      })
    : null;
  const from = fromEmail || notifyEmail;

  const money = (amount, currency) => {
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
    }
  };

  async function send({ to, subject, text, replyTo }) {
    if (!transport || !from || !to) {
      console.log(`[mail] To ${to || '(no address)'}: ${subject} (email not configured, see server/.env.example)`);
      return false;
    }
    try {
      await transport.sendMail({ from: `${getStoreName()} <${from}>`, to, replyTo, subject, text });
      return true;
    } catch (error) {
      // A mail failure must never lose a message or an order; both are saved
      // and visible in the admin.
      console.error('[mail] Failed to send:', error.message);
      return false;
    }
  }

  const summary = (order) => {
    const m = (amount) => money(amount, order.currency);
    return [
      ...order.items.map((item) => `${item.quantity} × ${item.title}${item.variantTitle ? ` (${item.variantTitle})` : ''}  ${m(item.price * item.quantity)}`),
      '',
      `Subtotal  ${m(order.subtotal)}`,
      ...(order.discount ? [`Discount (${order.discount.code})  -${m(order.discount.amount)}`] : []),
      `Shipping (${order.shipping.name})  ${order.shipping.price ? m(order.shipping.price) : 'Free'}`,
      ...(order.tax ? [`Tax  ${m(order.tax)}`] : []),
      `Total  ${m(order.total)}`
    ];
  };

  const address = (a) => [a.line1, a.line2, [a.postalCode, a.city, a.region].filter(Boolean).join(' '), a.country].filter(Boolean).join('\n');
  const name = (order) => `${order.customer.firstName} ${order.customer.lastName}`;
  const link = (order) => `${publicUrl}/orders/${order.token}`;

  return {
    enabled: Boolean(transport && from),

    contactReceived: (message) =>
      send({
        to: notifyEmail,
        subject: `${message.subject}: message from ${message.name}`,
        replyTo: message.email,
        text: [
          `${message.name} <${message.email}>`,
          message.orderNumber ? `Order: ${message.orderNumber}` : '',
          '',
          message.message
        ].filter((line, i) => line || i === 2).join('\n')
      }),

    orderPlaced: (order) =>
      send({
        to: notifyEmail,
        subject: `Order #${orderNumber(order)} from ${name(order)} (${money(order.total, order.currency)})`,
        replyTo: order.customer.email,
        text: [
          `Payment: ${order.paymentStatus === 'paid' ? 'paid online' : 'not paid yet. Send the customer payment details.'}`,
          '',
          ...summary(order),
          '',
          'Ship to:',
          name(order),
          address(order.shippingAddress),
          order.customer.phone ? `Phone: ${order.customer.phone}` : '',
          order.note ? `\nNote: ${order.note}` : ''
        ].join('\n')
      }),

    orderConfirmation: (order) =>
      send({
        to: order.customer.email,
        replyTo: notifyEmail,
        subject: `Order #${orderNumber(order)} confirmed`,
        text: [
          `Hi ${order.customer.firstName},`,
          '',
          order.paymentStatus === 'paid'
            ? 'Thanks for your order. Payment was received and we are getting it ready.'
            : 'Thanks for your order. We will email you shortly with payment details.',
          '',
          ...summary(order),
          '',
          'Shipping to:',
          address(order.shippingAddress),
          '',
          `Order status: ${link(order)}`
        ].join('\n')
      }),

    orderShipped: (order) =>
      send({
        to: order.customer.email,
        replyTo: notifyEmail,
        subject: `Order #${orderNumber(order)} has shipped`,
        text: [
          `Hi ${order.customer.firstName},`,
          '',
          'Your order is on its way.',
          order.trackingNumber ? `Tracking number: ${order.trackingNumber}` : '',
          order.trackingUrl ? `Track it: ${order.trackingUrl}` : '',
          '',
          `Order status: ${link(order)}`
        ].filter((line, i, all) => line || all[i - 1]).join('\n')
      })
  };
}
