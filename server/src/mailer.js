import nodemailer from 'nodemailer';

// Sends emails when SMTP settings are configured: notifications to the artist
// and confirmations to customers. Without SMTP, each email is just logged, and
// everything can still be read on the admin page.
export function createMailer({ smtp, notifyEmail, fromEmail, publicUrl, currency }) {
  const transport = smtp.host
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined
      })
    : null;
  const from = fromEmail || notifyEmail;

  const money = (amount) => {
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
      await transport.sendMail({ from, to, replyTo, subject, text });
      return true;
    } catch (error) {
      // A mail failure should never lose a message or an order; it is already
      // saved and visible on the admin page.
      console.error('[mail] Failed to send:', error.message);
      return false;
    }
  }

  const orderLines = (order) => [
    ...order.items.map((item) => `  ${item.quantity} × ${item.title}  ${money(item.price * item.quantity)}`),
    '',
    `  Subtotal  ${money(order.subtotal)}`,
    ...(order.discount ? [`  Discount (${order.discount.code})  −${money(order.discount.amount)}`] : []),
    `  Shipping  ${order.shipping ? money(order.shipping) : 'Free'}`,
    `  Total     ${money(order.total)}`
  ];

  const address = (a) => [a.line1, a.line2, [a.city, a.region, a.postalCode].filter(Boolean).join(', '), a.country].filter(Boolean).join('\n  ');
  const orderLink = (order) => `${publicUrl}/order/${order.token}`;

  return {
    enabled: Boolean(transport && from),

    contactReceived: (message) =>
      send({
        to: notifyEmail,
        subject: `New studio message from ${message.name}`,
        replyTo: message.email,
        text: `${message.name} <${message.email}> wrote:\n\n${message.message}`
      }),

    orderPlaced: (order) =>
      send({
        to: notifyEmail,
        subject: `New order #${order.id} from ${order.name} (${money(order.total)})`,
        replyTo: order.email,
        text: [
          `${order.name} <${order.email}>${order.phone ? `, ${order.phone}` : ''} placed an order.`,
          `Status: ${order.status === 'paid' ? 'paid online' : 'not paid yet: send the buyer payment details'}`,
          '',
          ...orderLines(order),
          '',
          'Ship to:',
          `  ${order.name}\n  ${address(order.address)}`,
          order.note ? `\nNote from the buyer: ${order.note}` : ''
        ].join('\n')
      }),

    orderConfirmation: (order) =>
      send({
        to: order.email,
        replyTo: notifyEmail,
        subject: `Thank you for your order #${order.id}`,
        text: [
          `Hi ${order.name},`,
          '',
          order.status === 'paid'
            ? 'Thank you! Your payment was received and your order is being prepared.'
            : 'Thank you! Your order was received. I will email you shortly with payment details and to confirm delivery.',
          '',
          ...orderLines(order),
          '',
          'Shipping to:',
          `  ${address(order.address)}`,
          '',
          `You can check your order any time here: ${orderLink(order)}`,
          '',
          'With love from the studio'
        ].join('\n')
      }),

    orderShipped: (order) =>
      send({
        to: order.email,
        replyTo: notifyEmail,
        subject: `Your order #${order.id} is on its way`,
        text: [
          `Hi ${order.name},`,
          '',
          'Good news: your order has been carefully packed and shipped.',
          order.trackingNumber ? `Tracking number: ${order.trackingNumber}` : '',
          '',
          `Order details: ${orderLink(order)}`,
          '',
          'Thank you for supporting handmade work!'
        ].join('\n')
      }),

    commissionReceived: (request) =>
      send({
        to: notifyEmail,
        subject: `New commission request: ${request.type} for ${request.name}`,
        replyTo: request.email,
        text: [
          `${request.name} <${request.email}> would like a commission.`,
          '',
          `Type: ${request.type}`,
          `Size: ${request.size || '-'}`,
          `Colours: ${request.colors || '-'}`,
          `Budget: ${request.budget || '-'}`,
          `Needed by: ${request.deadline || '-'}`,
          '',
          request.details,
          '',
          ...request.references.map((url) => `Reference: ${publicUrl}${url}`)
        ].join('\n')
      }),

    commissionAcknowledged: (request) =>
      send({
        to: request.email,
        replyTo: notifyEmail,
        subject: 'Your commission request was received',
        text: [
          `Hi ${request.name},`,
          '',
          `Thank you for your idea for a ${request.type.toLowerCase()}! I read every request personally and will reply within a few days with questions, a quote and a timeline.`,
          '',
          'With love from the studio'
        ].join('\n')
      }),

    backInStock: (alert, product) =>
      send({
        to: alert.email,
        subject: `${product.title} is available again`,
        text: [
          'Hello!',
          '',
          `You asked to hear when "${product.title}" was back. It's available now, but handmade pieces are limited, so don't wait too long:`,
          `${publicUrl}/shop/${product.id}`,
          '',
          'With love from the studio'
        ].join('\n')
      })
  };
}
