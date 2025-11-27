/**
 * OAuth routes for HubSpot authentication
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const oauth = require('./oauth');
const logger = require('../logger');

const router = express.Router();

/**
 * Initiate OAuth flow
 * GET /oauth/authorize
 */
router.get('/authorize', (req, res) => {
  const state = uuidv4();

  // Store state in session for CSRF protection
  req.session.oauthState = state;

  const authUrl = oauth.getAuthorizationUrl(state);
  logger.info('Initiating OAuth flow', { state });

  res.redirect(authUrl);
});

/**
 * OAuth callback handler
 * GET /oauth/callback
 */
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validate state parameter
  if (state !== req.session.oauthState) {
    logger.warn('OAuth state mismatch', { expected: req.session.oauthState, received: state });
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  // Clear state from session
  delete req.session.oauthState;

  if (!code) {
    logger.warn('No authorization code received');
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    // Exchange code for tokens
    const tokens = await oauth.exchangeCodeForTokens(code);

    // Get portal ID from token info (would need to make an API call in production)
    const portalId = tokens.hubId || 'default';

    // Store tokens
    oauth.storeTokens(portalId, tokens);

    // Store portal ID in session
    req.session.portalId = portalId;

    logger.info('OAuth flow completed successfully', { portalId });

    res.redirect('/dashboard');
  } catch (error) {
    logger.error('OAuth callback error', { error: error.message });
    res.status(500).json({ error: 'Failed to complete authentication' });
  }
});

/**
 * Logout / disconnect
 * POST /oauth/logout
 */
router.post('/logout', (req, res) => {
  const portalId = req.session.portalId;

  if (portalId) {
    oauth.removeTokens(portalId);
    delete req.session.portalId;
    logger.info('User logged out', { portalId });
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * Get connection status
 * GET /oauth/status
 */
router.get('/status', (req, res) => {
  const portalId = req.session.portalId;
  const isConnected = !!(portalId && oauth.getTokens(portalId));

  res.json({
    connected: isConnected,
    portalId: isConnected ? portalId : null
  });
});

module.exports = router;
