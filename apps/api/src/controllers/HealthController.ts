import { Controller, Get, Route, Tags } from 'tsoa';
import { HealthRepository } from '../repositories/HealthRepository';
import { createLogger } from '../lib/logger';

const logger = createLogger('HealthController');
const healthRepository = new HealthRepository();

interface HealthStatus {
  ok: boolean;
  database: boolean;
  timestamp: string;
}

@Route('health')
@Tags('Health')
export class HealthController extends Controller {
  @Get()
  public async check(): Promise<HealthStatus> {
    const database = await healthRepository.pingDatabase().catch((error) => {
      logger.error('Database ping failed', error);
      return false;
    });
    return { ok: database, database, timestamp: new Date().toISOString() };
  }
}
