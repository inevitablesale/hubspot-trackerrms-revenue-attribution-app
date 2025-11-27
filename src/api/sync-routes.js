/**
 * API routes for sync operations
 */
const express = require('express');
const SyncService = require('../sync/sync-service');
const { requireAuth, validateTrackerRMSKey } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

/**
 * Sync all jobs from TrackerRMS to HubSpot
 * POST /api/sync/jobs
 */
router.post('/jobs', requireAuth, validateTrackerRMSKey, async (req, res) => {
  try {
    const syncService = new SyncService(
      req.hubspot.accessToken,
      req.trackerrms.apiKey
    );

    const results = await syncService.syncJobs(req.body);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error('Job sync failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Sync all placements from TrackerRMS to HubSpot
 * POST /api/sync/placements
 */
router.post('/placements', requireAuth, validateTrackerRMSKey, async (req, res) => {
  try {
    const syncService = new SyncService(
      req.hubspot.accessToken,
      req.trackerrms.apiKey
    );

    const results = await syncService.syncPlacements(req.body);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error('Placement sync failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Sync revenue data from TrackerRMS to HubSpot
 * POST /api/sync/revenue
 */
router.post('/revenue', requireAuth, validateTrackerRMSKey, async (req, res) => {
  try {
    const syncService = new SyncService(
      req.hubspot.accessToken,
      req.trackerrms.apiKey
    );

    const results = await syncService.syncRevenue();

    res.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error('Revenue sync failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Full sync - jobs, placements, and revenue
 * POST /api/sync/full
 */
router.post('/full', requireAuth, validateTrackerRMSKey, async (req, res) => {
  try {
    const syncService = new SyncService(
      req.hubspot.accessToken,
      req.trackerrms.apiKey
    );

    const results = await syncService.fullSync();

    res.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error('Full sync failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get sync status
 * GET /api/sync/status
 */
router.get('/status', requireAuth, (req, res) => {
  res.json({
    connected: true,
    portalId: req.hubspot.portalId,
    lastSync: null // Would track this in a database
  });
});

module.exports = router;
