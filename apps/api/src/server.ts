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
import { ValidateError } from 'tsoa';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from './lib/env';
import { createLogger } from './lib/logger';
import { HttpError } from './lib/errors';
import { RegisterRoutes } from './generated/routes';
import { paymentsWebhookHandler } from './lib/paymentsWebhook';
import { startCronJobs } from './lib/cronJobs';
import { resolveOptionalUser } from './lib/tsoaAuth';
import { videoStreamHandler } from './lib/videoStream';

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

// Raw route, not a tsoa controller (see lib/videoStream.ts's top comment
// for why: Range/206 passthrough and manual response streaming aren't
// something tsoa's JSON-response model supports). Needs cookieParser
// above for session auth, so it's registered after that, same as every
// tsoa route below.
app.get('/videos/:slug/stream', (req, res) => {
  videoStreamHandler(req, res).catch((error) => {
    if (!res.headersSent) res.status(500).json({ message: 'Internal error' });
    logger.error('videoStreamHandler failed', error);
  });
});

RegisterRoutes(app);

// The generated OpenAPI schema documents every route/DTO shape in the API —
// harmless to leave open in local dev, but in production it's handed to
// anyone who requests it, admin included. Gated to signed-in ADMINs only,
// and a plain 404 (not 401/403) so an unauthenticated caller can't even
// tell the endpoint exists. Session-cookie lookup only (not tsoa's
// @Security, which this handler predates and isn't wired through) — same
// resolveOptionalUser used to personalize public reads.
const requireAdminForDocs: RequestHandler = (req, res, next) => {
  if (env.nodeEnv !== 'production') return next();
  resolveOptionalUser(req)
    .then((user) => {
      if (!user || user.role !== 'ADMIN') {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      next();
    })
    .catch(next);
};

// Raw OpenAPI document (the same object tsoa writes to generated/swagger.json),
// for API clients and codegen. Deliberately NOT behind requireAdminForDocs:
// it describes the API's shape, it carries no user data. Registered before
// the /docs mount so the admin gate on the Swagger UI never catches it.
const swaggerDocument = require('./generated/swagger.json');
app.get('/docs/swagger.json', (_req, res) => {
  res.json(swaggerDocument);
});

app.use('/docs', requireAdminForDocs, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  // tsoa's runtime schema validation throws this for request bodies that
  // fail the generated OpenAPI schema — a client mistake, not a crash,
  // so it must map to 400 with the field details, not the generic 500.
  if (err instanceof ValidateError) {
    return res.status(400).json({ message: 'Validation failed', fields: err.fields });
  }
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) logger.error('Unhandled error', err);
  res.status(status).json({ message: err instanceof Error ? err.message : 'Internal server error' });
};
app.use(errorHandler);

app.listen(env.port, () => {
  logger.info(`Sypher Next API listening on port ${env.port}`);
  startCronJobs();
});
