/**
 * Sync service for TrackerRMS to HubSpot data synchronization
 */
const { getClient } = require('../services/trackerrms-client');
const HubSpotService = require('../services/hubspot-service');
const logger = require('../logger');

class SyncService {
  constructor(hubspotAccessToken, trackerrmsApiKey) {
    this.hubspot = new HubSpotService(hubspotAccessToken);
    this.trackerrms = getClient(trackerrmsApiKey);
    this.syncLog = [];
  }

  /**
   * Sync all jobs from TrackerRMS to HubSpot
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results
   */
  async syncJobs(options = {}) {
    const results = { created: 0, updated: 0, errors: 0, items: [] };

    try {
      const jobs = await this.trackerrms.getJobs(options);

      for (const job of jobs) {
        try {
          const syncResult = await this.syncSingleJob(job);
          results.items.push(syncResult);

          if (syncResult.action === 'created') {
            results.created++;
          } else if (syncResult.action === 'updated') {
            results.updated++;
          }
        } catch (error) {
          results.errors++;
          results.items.push({
            jobId: job.id,
            action: 'error',
            error: error.message
          });
          logger.error('Failed to sync job', { jobId: job.id, error: error.message });
        }
      }

      logger.info('Job sync completed', results);
      return results;
    } catch (error) {
      logger.error('Failed to sync jobs', { error: error.message });
      throw error;
    }
  }

  /**
   * Sync a single job to HubSpot
   * @param {Object} job - TrackerRMS job data
   * @returns {Promise<Object>} Sync result
   */
  async syncSingleJob(job) {
    const dealProperties = this.mapJobToDealProperties(job);

    // Check if deal already exists
    const existingDeals = await this.hubspot.searchDeals('trackerrms_job_id', job.id);

    if (existingDeals.length > 0) {
      // Update existing deal
      const deal = await this.hubspot.updateDeal(existingDeals[0].id, dealProperties);
      return { jobId: job.id, dealId: deal.id, action: 'updated' };
    } else {
      // Create new deal
      const deal = await this.hubspot.createDeal(dealProperties);
      return { jobId: job.id, dealId: deal.id, action: 'created' };
    }
  }

  /**
   * Map TrackerRMS job to HubSpot deal properties
   * @param {Object} job - TrackerRMS job
   * @returns {Object} Deal properties
   */
  mapJobToDealProperties(job) {
    return {
      dealname: job.title || job.name,
      amount: job.estimatedRevenue || 0,
      dealstage: this.mapJobStatusToDealStage(job.status),
      closedate: job.targetDate || null,
      trackerrms_job_id: job.id,
      trackerrms_service_line: job.serviceLine || job.category || ''
    };
  }

  /**
   * Map TrackerRMS job status to HubSpot deal stage
   * @param {string} status - TrackerRMS job status
   * @returns {string} HubSpot deal stage ID
   */
  mapJobStatusToDealStage(status) {
    const stageMap = {
      'open': 'appointmentscheduled',
      'active': 'qualifiedtobuy',
      'interviewing': 'presentationscheduled',
      'offer': 'decisionmakerboughtin',
      'filled': 'closedwon',
      'closed': 'closedlost',
      'cancelled': 'closedlost'
    };

    return stageMap[status?.toLowerCase()] || 'appointmentscheduled';
  }

  /**
   * Sync all placements from TrackerRMS to HubSpot
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results
   */
  async syncPlacements(options = {}) {
    const results = { created: 0, updated: 0, errors: 0, items: [] };

    try {
      const placements = await this.trackerrms.getPlacements(options);

      for (const placement of placements) {
        try {
          const syncResult = await this.syncSinglePlacement(placement);
          results.items.push(syncResult);

          if (syncResult.action === 'created') {
            results.created++;
          } else if (syncResult.action === 'updated') {
            results.updated++;
          }
        } catch (error) {
          results.errors++;
          results.items.push({
            placementId: placement.id,
            action: 'error',
            error: error.message
          });
          logger.error('Failed to sync placement', { placementId: placement.id, error: error.message });
        }
      }

      logger.info('Placement sync completed', results);
      return results;
    } catch (error) {
      logger.error('Failed to sync placements', { error: error.message });
      throw error;
    }
  }

  /**
   * Sync a single placement to HubSpot
   * @param {Object} placement - TrackerRMS placement data
   * @returns {Promise<Object>} Sync result
   */
  async syncSinglePlacement(placement) {
    const dealProperties = this.mapPlacementToDealProperties(placement);

    // Check if deal already exists for this placement
    const existingDeals = await this.hubspot.searchDeals('trackerrms_placement_id', placement.id);

    if (existingDeals.length > 0) {
      // Update existing deal
      const deal = await this.hubspot.updateDeal(existingDeals[0].id, dealProperties);
      return { placementId: placement.id, dealId: deal.id, action: 'updated' };
    } else {
      // Check if there's a deal for the parent job
      if (placement.jobId) {
        const jobDeals = await this.hubspot.searchDeals('trackerrms_job_id', placement.jobId);

        if (jobDeals.length > 0) {
          // Update the job's deal with placement data
          const deal = await this.hubspot.updateDeal(jobDeals[0].id, dealProperties);
          return { placementId: placement.id, jobId: placement.jobId, dealId: deal.id, action: 'updated' };
        }
      }

      // Create new deal for placement
      const deal = await this.hubspot.createDeal(dealProperties);
      return { placementId: placement.id, dealId: deal.id, action: 'created' };
    }
  }

  /**
   * Map TrackerRMS placement to HubSpot deal properties
   * @param {Object} placement - TrackerRMS placement
   * @returns {Object} Deal properties
   */
  mapPlacementToDealProperties(placement) {
    return {
      dealname: placement.title || `Placement: ${placement.candidateName}`,
      amount: placement.revenue || placement.billRate * placement.hours || 0,
      dealstage: 'closedwon',
      closedate: placement.startDate || placement.createdAt,
      trackerrms_placement_id: placement.id,
      trackerrms_job_id: placement.jobId || '',
      trackerrms_service_line: placement.serviceLine || '',
      trackerrms_revenue: placement.revenue || 0,
      trackerrms_margin: placement.margin || 0,
      trackerrms_placement_date: placement.startDate || null
    };
  }

  /**
   * Sync revenue data for all placements
   * @returns {Promise<Object>} Sync results
   */
  async syncRevenue() {
    const results = { updated: 0, errors: 0, items: [] };

    try {
      const placements = await this.trackerrms.getPlacements({ status: 'active' });

      for (const placement of placements) {
        try {
          const revenueData = await this.trackerrms.getPlacementRevenue(placement.id);

          // Find the associated deal
          const deals = await this.hubspot.searchDeals('trackerrms_placement_id', placement.id);

          if (deals.length > 0) {
            await this.hubspot.updateDeal(deals[0].id, {
              trackerrms_revenue: revenueData.totalRevenue || 0,
              trackerrms_margin: revenueData.margin || 0,
              amount: revenueData.totalRevenue || 0
            });

            results.updated++;
            results.items.push({
              placementId: placement.id,
              dealId: deals[0].id,
              revenue: revenueData.totalRevenue
            });
          }
        } catch (error) {
          results.errors++;
          logger.error('Failed to sync revenue', { placementId: placement.id, error: error.message });
        }
      }

      logger.info('Revenue sync completed', results);
      return results;
    } catch (error) {
      logger.error('Failed to sync revenue', { error: error.message });
      throw error;
    }
  }

  /**
   * Full sync - jobs, placements, and revenue
   * @returns {Promise<Object>} Combined sync results
   */
  async fullSync() {
    logger.info('Starting full sync');

    const results = {
      jobs: await this.syncJobs(),
      placements: await this.syncPlacements(),
      revenue: await this.syncRevenue()
    };

    logger.info('Full sync completed', {
      jobsCreated: results.jobs.created,
      jobsUpdated: results.jobs.updated,
      placementsCreated: results.placements.created,
      placementsUpdated: results.placements.updated,
      revenueUpdated: results.revenue.updated
    });

    return results;
  }
}

module.exports = SyncService;
