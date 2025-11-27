/**
 * TrackerRMS API client for Jobs and Placements
 */
const axios = require('axios');
const { config } = require('../config');
const logger = require('../logger');

class TrackerRMSClient {
  constructor(apiKey = config.trackerrms.apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = config.trackerrms.baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Get all jobs with optional filters
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} List of jobs
   */
  async getJobs(options = {}) {
    try {
      const response = await this.client.get('/jobs', { params: options });
      logger.info('Fetched jobs from TrackerRMS', { count: response.data.length });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch jobs from TrackerRMS', { error: error.message });
      throw error;
    }
  }

  /**
   * Get a single job by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job data
   */
  async getJob(jobId) {
    try {
      const response = await this.client.get(`/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch job from TrackerRMS', { jobId, error: error.message });
      throw error;
    }
  }

  /**
   * Get all placements with optional filters
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} List of placements
   */
  async getPlacements(options = {}) {
    try {
      const response = await this.client.get('/placements', { params: options });
      logger.info('Fetched placements from TrackerRMS', { count: response.data.length });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch placements from TrackerRMS', { error: error.message });
      throw error;
    }
  }

  /**
   * Get a single placement by ID
   * @param {string} placementId - Placement ID
   * @returns {Promise<Object>} Placement data
   */
  async getPlacement(placementId) {
    try {
      const response = await this.client.get(`/placements/${placementId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch placement from TrackerRMS', { placementId, error: error.message });
      throw error;
    }
  }

  /**
   * Get placements for a specific job
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} List of placements
   */
  async getPlacementsByJob(jobId) {
    try {
      const response = await this.client.get(`/jobs/${jobId}/placements`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch placements for job from TrackerRMS', { jobId, error: error.message });
      throw error;
    }
  }

  /**
   * Get candidates for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} List of candidates
   */
  async getCandidatesByJob(jobId) {
    try {
      const response = await this.client.get(`/jobs/${jobId}/candidates`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch candidates for job from TrackerRMS', { jobId, error: error.message });
      throw error;
    }
  }

  /**
   * Get service lines / categories
   * @returns {Promise<Array>} List of service lines
   */
  async getServiceLines() {
    try {
      const response = await this.client.get('/service-lines');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch service lines from TrackerRMS', { error: error.message });
      throw error;
    }
  }

  /**
   * Get revenue data for a placement
   * @param {string} placementId - Placement ID
   * @returns {Promise<Object>} Revenue data
   */
  async getPlacementRevenue(placementId) {
    try {
      const response = await this.client.get(`/placements/${placementId}/revenue`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch placement revenue from TrackerRMS', { placementId, error: error.message });
      throw error;
    }
  }
}

// Singleton instance
let clientInstance = null;

function getClient(apiKey) {
  if (!clientInstance || apiKey) {
    clientInstance = new TrackerRMSClient(apiKey);
  }
  return clientInstance;
}

module.exports = { TrackerRMSClient, getClient };
