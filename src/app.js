/**
 * Express application setup
 */
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { config } = require('./config');
const logger = require('./logger');
const { errorHandler, requestLogger } = require('./middleware/auth');

// Routes
const authRoutes = require('./auth/routes');
const syncRoutes = require('./api/sync-routes');
const crmCardRoutes = require('./api/crm-card-routes');
const dashboardRoutes = require('./api/dashboard-routes');
const webhookRoutes = require('./api/webhook-routes');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production'
}));

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session management
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
  app.use(requestLogger);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: require('../package.json').version
  });
});

// Main landing page
app.get('/', (req, res) => {
  const isConnected = req.session?.portalId !== undefined;

  res.json({
    name: 'HubSpot TrackerRMS Revenue Attribution App',
    description: 'Connects TrackerRMS Jobs and Placements to HubSpot Deals for end-to-end revenue attribution',
    version: require('../package.json').version,
    connected: isConnected,
    endpoints: {
      auth: '/oauth/authorize',
      sync: '/api/sync',
      crmCards: '/api/crm-cards',
      dashboards: '/api/dashboards',
      webhooks: '/api/webhooks'
    }
  });
});

// Dashboard page (after OAuth)
app.get('/dashboard', (req, res) => {
  if (!req.session?.portalId) {
    return res.redirect('/oauth/authorize');
  }

  res.json({
    message: 'Welcome to HubSpot TrackerRMS Integration Dashboard',
    portalId: req.session.portalId,
    actions: {
      syncJobs: 'POST /api/sync/jobs',
      syncPlacements: 'POST /api/sync/placements',
      syncRevenue: 'POST /api/sync/revenue',
      fullSync: 'POST /api/sync/full',
      viewDashboards: {
        attribution: 'GET /api/dashboards/attribution',
        velocity: 'GET /api/dashboards/velocity',
        roi: 'GET /api/dashboards/roi',
        executive: 'GET /api/dashboards/executive'
      }
    }
  });
});

// API routes
app.use('/oauth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/crm-cards', crmCardRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;
