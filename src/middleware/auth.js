/**
 * Authentication middleware
 */
const oauth = require('../auth/oauth');
const logger = require('../logger');

/**
 * Require HubSpot authentication
 * Checks if user has valid tokens in session
 */
function requireAuth(req, res, next) {
  const portalId = req.session?.portalId;

  if (!portalId) {
    logger.warn('Authentication required - no portal ID in session');
    return res.status(401).json({
      error: 'Authentication required',
      authUrl: '/oauth/authorize'
    });
  }

  const tokens = oauth.getTokens(portalId);

  if (!tokens) {
    logger.warn('Authentication required - no tokens found', { portalId });
    return res.status(401).json({
      error: 'Authentication required',
      authUrl: '/oauth/authorize'
    });
  }

  // Attach token info to request
  req.hubspot = {
    portalId,
    accessToken: tokens.accessToken
  };

  next();
}

/**
 * Optional authentication - attach tokens if available
 */
function optionalAuth(req, res, next) {
  const portalId = req.session?.portalId;

  if (portalId) {
    const tokens = oauth.getTokens(portalId);
    if (tokens) {
      req.hubspot = {
        portalId,
        accessToken: tokens.accessToken
      };
    }
  }

  next();
}

/**
 * Validate TrackerRMS API key from header only (not query params for security)
 */
function validateTrackerRMSKey(req, res, next) {
  // Only accept API key from header to avoid logging sensitive data in URLs
  const apiKey = req.headers['x-trackerrms-api-key'];

  if (!apiKey) {
    return res.status(400).json({
      error: 'TrackerRMS API key required in X-TrackerRMS-API-Key header'
    });
  }

  req.trackerrms = { apiKey };
  next();
}

/**
 * Error handling middleware
 */
function errorHandler(err, req, res, _next) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  validateTrackerRMSKey,
  errorHandler,
  requestLogger
};
