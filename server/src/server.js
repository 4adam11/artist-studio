import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createMailer } from './mailer.js';
import { createPayments } from './payments.js';
import { seed } from './seed.js';
import { getSettings } from './settings.js';
import { createStore } from './store.js';
import { loadEnvFile } from './env.js';

// ENV_FILE lets the ready-to-run copy in app/ point at server/.env.
loadEnvFile(process.env.ENV_FILE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'));

const config = loadConfig();
const store = await createStore({ dataDir: config.dataDir, seed });
const mailer = createMailer(config, () => getSettings(store, config).storeName);
const payments = createPayments({ secretKey: config.stripeSecretKey, publicUrl: config.publicUrl });

const app = createApp({ store, config, mailer, payments });

// Express 5 calls this with an error if the server could not start.
app.listen(config.port, (error) => {
  if (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `Port ${config.port} is already in use by another program.\n` +
        'Stop that program, or pick another port by setting PORT in server/.env\n' +
        '(and API_TARGET=http://localhost:<port> for the client dev server).'
      );
    } else {
      console.error(error);
    }
    process.exit(1);
  }

  console.log(`Store API running at http://localhost:${config.port}`);
  console.log(`  Data file:       ${config.dataDir}`);
  console.log(`  Admin page:      ${config.adminPassword ? 'on' : 'off (set ADMIN_PASSWORD)'}`);
  console.log(`  Online payments: ${payments ? 'Stripe' : 'off (orders are taken and marked paid by hand)'}`);
  console.log(`  Email alerts:    ${mailer.enabled ? `to ${config.notifyEmail}` : 'off (set SMTP_HOST and NOTIFY_EMAIL)'}`);
});
