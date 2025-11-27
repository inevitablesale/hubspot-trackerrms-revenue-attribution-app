/**
 * Configuration settings for the HubSpot TrackerRMS Revenue Attribution App
 */
require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-key',

  // HubSpot configuration
  hubspot: {
    clientId: process.env.HUBSPOT_CLIENT_ID,
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
    appId: process.env.HUBSPOT_APP_ID,
    redirectUri: process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
    scopes: (process.env.HUBSPOT_SCOPES || 'crm.objects.deals.read,crm.objects.deals.write').split(','),
    baseUrl: 'https://api.hubapi.com'
  },

  // TrackerRMS configuration
  trackerrms: {
    apiKey: process.env.TRACKERRMS_API_KEY,
    baseUrl: process.env.TRACKERRMS_BASE_URL || 'https://api.trackerrms.com/v1'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

/**
 * Validate required configuration
 */
function validateConfig() {
  const requiredFields = [
    { key: 'hubspot.clientId', value: config.hubspot.clientId },
    { key: 'hubspot.clientSecret', value: config.hubspot.clientSecret }
  ];

  const missing = requiredFields.filter(field => !field.value);

  if (missing.length > 0 && config.nodeEnv === 'production') {
    throw new Error(`Missing required configuration: ${missing.map(f => f.key).join(', ')}`);
  }

  return missing.length === 0;
}

module.exports = { config, validateConfig };
