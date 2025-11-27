/**
 * OAuth 2.0 authentication service for HubSpot
 */
const { Client } = require('@hubspot/api-client');
const { config } = require('../config');
const logger = require('../logger');

// In-memory token storage (should be replaced with database in production)
const tokenStore = new Map();

/**
 * Generate OAuth authorization URL
 * @param {string} state - State parameter for CSRF protection
 * @returns {string} Authorization URL
 */
function getAuthorizationUrl(state) {
  const hubspotClient = new Client();
  const scopes = config.hubspot.scopes;

  return hubspotClient.oauth.getAuthorizationUrl(
    config.hubspot.clientId,
    config.hubspot.redirectUri,
    scopes.join(' '),
    state
  );
}

/**
 * Exchange authorization code for access tokens
 * @param {string} code - Authorization code
 * @returns {Promise<Object>} Token response
 */
async function exchangeCodeForTokens(code) {
  const hubspotClient = new Client();

  try {
    const tokenResponse = await hubspotClient.oauth.tokensApi.create(
      'authorization_code',
      code,
      config.hubspot.redirectUri,
      config.hubspot.clientId,
      config.hubspot.clientSecret
    );

    logger.info('Successfully exchanged code for tokens');
    return tokenResponse;
  } catch (error) {
    logger.error('Failed to exchange code for tokens', { error: error.message });
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New token response
 */
async function refreshAccessToken(refreshToken) {
  const hubspotClient = new Client();

  try {
    const tokenResponse = await hubspotClient.oauth.tokensApi.create(
      'refresh_token',
      undefined,
      undefined,
      config.hubspot.clientId,
      config.hubspot.clientSecret,
      refreshToken
    );

    logger.info('Successfully refreshed access token');
    return tokenResponse;
  } catch (error) {
    logger.error('Failed to refresh access token', { error: error.message });
    throw error;
  }
}

/**
 * Store tokens for a portal
 * @param {string} portalId - HubSpot portal ID
 * @param {Object} tokens - Token object
 */
function storeTokens(portalId, tokens) {
  const tokenData = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + (tokens.expiresIn * 1000),
    portalId
  };

  tokenStore.set(portalId, tokenData);
  logger.info('Tokens stored for portal', { portalId });
}

/**
 * Get tokens for a portal
 * @param {string} portalId - HubSpot portal ID
 * @returns {Object|null} Token data
 */
function getTokens(portalId) {
  return tokenStore.get(portalId) || null;
}

/**
 * Check if tokens are expired
 * @param {Object} tokens - Token data
 * @returns {boolean} True if expired
 */
function isTokenExpired(tokens) {
  if (!tokens || !tokens.expiresAt) {
    return true;
  }
  // Consider token expired 5 minutes before actual expiry
  return Date.now() >= (tokens.expiresAt - 300000);
}

/**
 * Get a valid access token, refreshing if necessary
 * @param {string} portalId - HubSpot portal ID
 * @returns {Promise<string>} Valid access token
 */
async function getValidAccessToken(portalId) {
  let tokens = getTokens(portalId);

  if (!tokens) {
    throw new Error(`No tokens found for portal ${portalId}`);
  }

  if (isTokenExpired(tokens)) {
    const newTokens = await refreshAccessToken(tokens.refreshToken);
    storeTokens(portalId, newTokens);
    tokens = getTokens(portalId);
  }

  return tokens.accessToken;
}

/**
 * Remove tokens for a portal (logout)
 * @param {string} portalId - HubSpot portal ID
 */
function removeTokens(portalId) {
  tokenStore.delete(portalId);
  logger.info('Tokens removed for portal', { portalId });
}

/**
 * Get all connected portal IDs
 * @returns {string[]} Array of portal IDs
 */
function getConnectedPortals() {
  return Array.from(tokenStore.keys());
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  storeTokens,
  getTokens,
  isTokenExpired,
  getValidAccessToken,
  removeTokens,
  getConnectedPortals
};
