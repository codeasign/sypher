if (process.env.NEW_RELIC_LICENSE_KEY) {
  // Must be required before anything else per the newrelic agent's own
  // instrumentation requirements. Skipped entirely in local dev (no key
  // set yet) to avoid a noisy "agent disabled" log on every boot.
  require('newrelic');
}

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import type { ErrorRequestHandler } from 'express';
import { env } from './lib/env';
import { createLogger } from './lib/logger';
import { HttpError } from './lib/errors';
import { RegisterRoutes } from './generated/routes';
import { paymentsWebhookHandler } from './lib/paymentsWebhook';
import { startCronJobs } from './lib/cronJobs';

const logger = createLogger('server');
const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);

// Registered before express.json(): Razorpay's webhook signature is over
// the exact raw request bytes, which express.json() would already have
// consumed/parsed by the time a tsoa controller saw them. Not a session
// route — Razorpay's servers call this directly, not a signed-in browser.
app.post('/payments/webhook', express.raw({ type: 'application/json' }), paymentsWebhookHandler);

app.use(express.json());
app.use(cookieParser());

RegisterRoutes(app);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(require('./generated/swagger.json')));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) logger.error('Unhandled error', err);
  res.status(status).json({ message: err instanceof Error ? err.message : 'Internal server error' });
};
app.use(errorHandler);

app.listen(env.port, () => {
  logger.info(`Sypher Next API listening on port ${env.port}`);
  startCronJobs();
});
