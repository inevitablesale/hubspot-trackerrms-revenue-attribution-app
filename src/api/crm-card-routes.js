/**
 * API routes for CRM cards
 */
const express = require('express');
const CRMCardService = require('../crm-cards/crm-card-service');
const { getClient } = require('../services/trackerrms-client');
const ScoringService = require('../scoring/scoring-service');
const logger = require('../logger');

const router = express.Router();
const crmCardService = new CRMCardService();
const scoringService = new ScoringService();

/**
 * Get job CRM card data
 * GET /api/crm-cards/job/:jobId
 */
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    // Only accept API key from header for security
    const apiKey = req.headers['x-trackerrms-api-key'];

    if (!apiKey) {
      return res.json(crmCardService.buildErrorCard('TrackerRMS API key required in header'));
    }

    const trackerrms = getClient(apiKey);
    const job = await trackerrms.getJob(jobId);

    // Get candidates if available
    try {
      job.candidates = await trackerrms.getCandidatesByJob(jobId);
    } catch (_e) {
      job.candidates = [];
    }

    const card = crmCardService.buildJobCard(job);
    res.json(card);
  } catch (error) {
    logger.error('Failed to get job card', { error: error.message });
    res.json(crmCardService.buildErrorCard(`Failed to load job: ${error.message}`));
  }
});

/**
 * Get placement CRM card data
 * GET /api/crm-cards/placement/:placementId
 */
router.get('/placement/:placementId', async (req, res) => {
  try {
    const { placementId } = req.params;
    // Only accept API key from header for security
    const apiKey = req.headers['x-trackerrms-api-key'];

    if (!apiKey) {
      return res.json(crmCardService.buildErrorCard('TrackerRMS API key required in header'));
    }

    const trackerrms = getClient(apiKey);
    const placement = await trackerrms.getPlacement(placementId);

    // Get associated job for velocity calculation
    let job = null;
    if (placement.jobId) {
      try {
        job = await trackerrms.getJob(placement.jobId);
      } catch (_e) {
        // Job not found, continue without it
      }
    }

    // Calculate scores
    placement.velocityScore = scoringService.calculateVelocityScore(placement, job);
    placement.roiScore = scoringService.calculateROIScore(placement);
    placement.overallScore = scoringService.calculateOverallScore(
      placement.velocityScore,
      placement.roiScore
    );

    const card = crmCardService.buildPlacementCard(placement);
    res.json(card);
  } catch (error) {
    logger.error('Failed to get placement card', { error: error.message });
    res.json(crmCardService.buildErrorCard(`Failed to load placement: ${error.message}`));
  }
});

/**
 * Get attribution CRM card data for a deal
 * GET /api/crm-cards/attribution/:dealId
 */
router.get('/attribution/:dealId', async (req, res) => {
  try {
    // Only accept API key from header for security
    const apiKey = req.headers['x-trackerrms-api-key'];

    if (!apiKey) {
      return res.json(crmCardService.buildErrorCard('TrackerRMS API key required in header'));
    }

    const trackerrms = getClient(apiKey);
    const placements = await trackerrms.getPlacements();

    const attribution = scoringService.calculateServiceLineAttribution(placements);

    const attributionData = {
      totalRevenue: Object.values(attribution)
        .reduce((sum, line) => sum + line.totalRevenue, 0),
      totalPlacements: placements.length,
      serviceLines: attribution
    };

    const card = crmCardService.buildAttributionCard(attributionData);
    res.json(card);
  } catch (error) {
    logger.error('Failed to get attribution card', { error: error.message });
    res.json(crmCardService.buildErrorCard(`Failed to load attribution: ${error.message}`));
  }
});

module.exports = router;
