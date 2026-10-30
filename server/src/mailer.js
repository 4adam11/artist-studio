import nodemailer from 'nodemailer';

// Sends notification emails to the artist when SMTP settings are configured.
// Without them, notifications are just logged, and messages and orders can
// still be read from the admin page.
export function createMailer({ smtp, notifyEmail, fromEmail }) {
  const transport = smtp.host
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined
      })
    : null;

  async function send({ subject, text, replyTo }) {
    if (!transport || !notifyEmail) {
      console.log(`[mail] ${subject} (email not configured, see server/.env.example)`);
      return false;
    }
    try {
      await transport.sendMail({ from: fromEmail || notifyEmail, to: notifyEmail, replyTo, subject, text });
      return true;
    } catch (error) {
      // A mail failure should never lose the customer's message or order;
      // it is already saved and visible in the admin page.
      console.error('[mail] Failed to send notification:', error.message);
      return false;
    }
  }

  return {
    enabled: Boolean(transport && notifyEmail),

    contactReceived: (message) =>
      send({
        subject: `New studio message from ${message.name}`,
        replyTo: message.email,
        text: `${message.name} <${message.email}> wrote:\n\n${message.message}`
      }),

    orderPlaced: (order, currency) =>
      send({
        subject: `New order #${order.id} from ${order.name}`,
        replyTo: order.email,
        text: [
          `${order.name} <${order.email}> placed an order (${order.status}).`,
          '',
          ...order.items.map((item) => `${item.quantity} x ${item.title} @ ${item.price.toFixed(2)} ${currency}`),
          '',
          `Total: ${order.total.toFixed(2)} ${currency}`,
          order.note ? `\nNote: ${order.note}` : ''
        ].join('\n')
      })
  };
}
