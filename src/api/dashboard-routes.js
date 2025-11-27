/**
 * API routes for dashboard data
 */
const express = require('express');
const DashboardService = require('../dashboards/dashboard-service');
const { getClient } = require('../services/trackerrms-client');
const { validateTrackerRMSKey } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();
const dashboardService = new DashboardService();

/**
 * Get service line attribution dashboard data
 * GET /api/dashboards/attribution
 */
router.get('/attribution', validateTrackerRMSKey, async (req, res) => {
  try {
    const trackerrms = getClient(req.trackerrms.apiKey);
    const placements = await trackerrms.getPlacements();

    const data = dashboardService.getServiceLineAttributionData(placements);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Failed to get attribution dashboard', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get placement velocity dashboard data
 * GET /api/dashboards/velocity
 */
router.get('/velocity', validateTrackerRMSKey, async (req, res) => {
  try {
    const trackerrms = getClient(req.trackerrms.apiKey);
    const placements = await trackerrms.getPlacements();

    // Enrich placements with job data
    for (const placement of placements) {
      if (placement.jobId) {
        try {
          placement.job = await trackerrms.getJob(placement.jobId);
        } catch (_e) {
          // Job not found, continue
        }
      }
    }

    const data = dashboardService.getPlacementVelocityData(placements);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Failed to get velocity dashboard', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get ROI dashboard data
 * GET /api/dashboards/roi
 */
router.get('/roi', validateTrackerRMSKey, async (req, res) => {
  try {
    const trackerrms = getClient(req.trackerrms.apiKey);
    const placements = await trackerrms.getPlacements();

    const data = dashboardService.getROIDashboardData(placements);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Failed to get ROI dashboard', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get executive dashboard (all metrics combined)
 * GET /api/dashboards/executive
 */
router.get('/executive', validateTrackerRMSKey, async (req, res) => {
  try {
    const trackerrms = getClient(req.trackerrms.apiKey);

    const [placements, jobs] = await Promise.all([
      trackerrms.getPlacements(),
      trackerrms.getJobs()
    ]);

    // Enrich placements with job data
    const jobMap = new Map(jobs.map(j => [j.id, j]));
    for (const placement of placements) {
      if (placement.jobId && jobMap.has(placement.jobId)) {
        placement.job = jobMap.get(placement.jobId);
      }
    }

    const data = dashboardService.getExecutiveDashboardData(placements, jobs);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Failed to get executive dashboard', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
