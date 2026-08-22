'use strict';

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME ?? 'sypher-next-api'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY ?? '',
  agent_enabled: Boolean(process.env.NEW_RELIC_LICENSE_KEY),
  logging: {
    level: 'info',
  },
  allow_all_headers: true,
  attributes: {
    exclude: ['request.headers.cookie', 'request.headers.authorization'],
  },
};
