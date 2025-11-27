/**
 * Main entry point for the HubSpot TrackerRMS Revenue Attribution App
 */
const app = require('./app');
const { config, validateConfig } = require('./config');
const logger = require('./logger');

// Validate configuration
const isConfigValid = validateConfig();

if (!isConfigValid && config.nodeEnv === 'production') {
  logger.error('Invalid configuration - cannot start in production mode');
  process.exit(1);
}

if (!isConfigValid) {
  logger.warn('Configuration incomplete - some features may not work');
}

// Start server
const server = app.listen(config.port, () => {
  logger.info('Server started', {
    port: config.port,
    environment: config.nodeEnv,
    configValid: isConfigValid
  });

  logger.info('Available endpoints:', {
    health: `http://localhost:${config.port}/health`,
    auth: `http://localhost:${config.port}/oauth/authorize`,
    dashboard: `http://localhost:${config.port}/dashboard`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = server;
