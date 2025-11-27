/**
 * Webhook routes for HubSpot and TrackerRMS integrations
 */
const express = require('express');
const crypto = require('crypto');
const SyncService = require('../sync/sync-service');
const oauth = require('../auth/oauth');
const { config } = require('../config');
const logger = require('../logger');

const router = express.Router();

/**
 * Verify HubSpot webhook signature
 * @param {Object} req - Request object
 * @returns {boolean} True if signature is valid
 */
function verifyHubSpotSignature(req) {
  const signature = req.headers['x-hubspot-signature-v3'];
  const timestamp = req.headers['x-hubspot-request-timestamp'];

  if (!signature || !timestamp) {
    return false;
  }

  // Check timestamp is within 5 minutes
  const timestampMs = parseInt(timestamp, 10);
  if (Math.abs(Date.now() - timestampMs) > 300000) {
    return false;
  }

  const sourceString = `${req.method}${req.originalUrl}${JSON.stringify(req.body)}${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.hubspot.clientSecret)
    .update(sourceString)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * HubSpot webhook handler for deal updates
 * POST /api/webhooks/hubspot/deals
 */
router.post('/hubspot/deals', async (req, res) => {
  // Verify signature in production
  if (config.nodeEnv === 'production' && !verifyHubSpotSignature(req)) {
    logger.warn('Invalid HubSpot webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];

    for (const event of events) {
      logger.info('HubSpot deal webhook received', {
        eventType: event.subscriptionType,
        dealId: event.objectId
      });

      // Process based on event type
      switch (event.subscriptionType) {
      case 'deal.propertyChange':
        // Handle deal property changes
        logger.info('Deal property changed', {
          dealId: event.objectId,
          propertyName: event.propertyName,
          propertyValue: event.propertyValue
        });
        break;

      case 'deal.creation':
        // Handle new deal creation
        logger.info('New deal created', { dealId: event.objectId });
        break;

      case 'deal.deletion':
        // Handle deal deletion
        logger.info('Deal deleted', { dealId: event.objectId });
        break;
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error processing HubSpot webhook', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * TrackerRMS webhook handler for job updates
 * POST /api/webhooks/trackerrms/jobs
 */
router.post('/trackerrms/jobs', async (req, res) => {
  try {
    const { event, data } = req.body;
    const portalId = req.headers['x-portal-id'];
    const trackerRMSApiKey = req.headers['x-trackerrms-api-key'];

    logger.info('TrackerRMS job webhook received', { event, jobId: data?.id });

    if (!portalId || !trackerRMSApiKey) {
      return res.status(400).json({
        error: 'Missing portal ID or TrackerRMS API key'
      });
    }

    // Get access token for portal
    const tokens = oauth.getTokens(portalId);
    if (!tokens) {
      return res.status(401).json({ error: 'Portal not authenticated' });
    }

    const syncService = new SyncService(tokens.accessToken, trackerRMSApiKey);

    switch (event) {
    case 'job.created':
    case 'job.updated':
      await syncService.syncSingleJob(data);
      break;

    case 'job.filled':
      await syncService.syncSingleJob(data);
      // Trigger placement sync for this job
      if (data.placements) {
        for (const placement of data.placements) {
          await syncService.syncSinglePlacement(placement);
        }
      }
      break;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error processing TrackerRMS webhook', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * TrackerRMS webhook handler for placement updates
 * POST /api/webhooks/trackerrms/placements
 */
router.post('/trackerrms/placements', async (req, res) => {
  try {
    const { event, data } = req.body;
    const portalId = req.headers['x-portal-id'];
    const trackerRMSApiKey = req.headers['x-trackerrms-api-key'];

    logger.info('TrackerRMS placement webhook received', {
      event,
      placementId: data?.id
    });

    if (!portalId || !trackerRMSApiKey) {
      return res.status(400).json({
        error: 'Missing portal ID or TrackerRMS API key'
      });
    }

    const tokens = oauth.getTokens(portalId);
    if (!tokens) {
      return res.status(401).json({ error: 'Portal not authenticated' });
    }

    const syncService = new SyncService(tokens.accessToken, trackerRMSApiKey);

    switch (event) {
    case 'placement.created':
    case 'placement.updated':
    case 'placement.ended':
      await syncService.syncSinglePlacement(data);
      break;

    case 'placement.revenue_updated':
      // Update revenue data specifically
      await syncService.syncRevenue();
      break;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error processing TrackerRMS placement webhook', {
      error: error.message
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
