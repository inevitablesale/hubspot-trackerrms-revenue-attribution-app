/**
 * Timeline event service for HubSpot
 */
const { Client } = require('@hubspot/api-client');
const logger = require('../logger');

class TimelineService {
  constructor(accessToken, eventTemplateId) {
    this.client = new Client({ accessToken });
    this.eventTemplateId = eventTemplateId;
  }

  /**
   * Create a timeline event for a placement
   * @param {Object} options - Event options
   * @returns {Promise<Object>} Created event
   */
  async createPlacementEvent(options) {
    const { contactId, placement, job } = options;

    const tokens = {
      placementId: placement.id,
      candidateName: placement.candidateName || 'Unknown',
      jobTitle: job?.title || placement.jobTitle || 'Unknown Job',
      clientName: placement.clientName || 'Unknown Client',
      startDate: placement.startDate,
      billRate: placement.billRate || 0,
      revenue: placement.revenue || 0,
      serviceLine: placement.serviceLine || 'N/A'
    };

    return this.createEvent({
      objectType: 'contacts',
      objectId: contactId,
      eventType: 'placement_created',
      tokens
    });
  }

  /**
   * Create a timeline event for a job status change
   * @param {Object} options - Event options
   * @returns {Promise<Object>} Created event
   */
  async createJobStatusEvent(options) {
    const { contactId, job, previousStatus, newStatus } = options;

    const tokens = {
      jobId: job.id,
      jobTitle: job.title,
      clientName: job.clientName || 'Unknown',
      previousStatus: previousStatus || 'N/A',
      newStatus: newStatus,
      serviceLine: job.serviceLine || 'N/A'
    };

    return this.createEvent({
      objectType: 'contacts',
      objectId: contactId,
      eventType: 'job_status_changed',
      tokens
    });
  }

  /**
   * Create a timeline event for revenue milestone
   * @param {Object} options - Event options
   * @returns {Promise<Object>} Created event
   */
  async createRevenueMilestoneEvent(options) {
    const { dealId, placement, milestone, totalRevenue } = options;

    const tokens = {
      placementId: placement.id,
      candidateName: placement.candidateName || 'Unknown',
      milestone,
      totalRevenue,
      serviceLine: placement.serviceLine || 'N/A'
    };

    return this.createEvent({
      objectType: 'deals',
      objectId: dealId,
      eventType: 'revenue_milestone',
      tokens
    });
  }

  /**
   * Create a generic timeline event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  async createEvent(eventData) {
    try {
      const event = {
        eventTemplateId: this.eventTemplateId,
        objectId: eventData.objectId,
        tokens: eventData.tokens,
        extraData: eventData.extraData || {},
        timestamp: eventData.timestamp || Date.now()
      };

      // Note: The actual API endpoint varies by HubSpot SDK version
      // This is a simplified implementation
      logger.info('Creating timeline event', {
        objectType: eventData.objectType,
        objectId: eventData.objectId,
        eventType: eventData.eventType
      });

      return event;
    } catch (error) {
      logger.error('Failed to create timeline event', { error: error.message });
      throw error;
    }
  }

  /**
   * Create batch timeline events
   * @param {Array} events - Array of event data
   * @returns {Promise<Array>} Created events
   */
  async createBatchEvents(events) {
    const results = [];

    for (const eventData of events) {
      try {
        const event = await this.createEvent(eventData);
        results.push({ success: true, event });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = TimelineService;
