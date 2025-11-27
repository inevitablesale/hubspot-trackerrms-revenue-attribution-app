/**
 * HubSpot API service for CRM operations
 */
const { Client } = require('@hubspot/api-client');
const logger = require('../logger');

class HubSpotService {
  constructor(accessToken) {
    this.client = new Client({ accessToken });
  }

  // ============ DEALS ============

  /**
   * Create a deal in HubSpot
   * @param {Object} dealProperties - Deal properties
   * @returns {Promise<Object>} Created deal
   */
  async createDeal(dealProperties) {
    try {
      const response = await this.client.crm.deals.basicApi.create({
        properties: dealProperties
      });
      logger.info('Created deal in HubSpot', { dealId: response.id });
      return response;
    } catch (error) {
      logger.error('Failed to create deal in HubSpot', { error: error.message });
      throw error;
    }
  }

  /**
   * Update a deal in HubSpot
   * @param {string} dealId - Deal ID
   * @param {Object} dealProperties - Properties to update
   * @returns {Promise<Object>} Updated deal
   */
  async updateDeal(dealId, dealProperties) {
    try {
      const response = await this.client.crm.deals.basicApi.update(dealId, {
        properties: dealProperties
      });
      logger.info('Updated deal in HubSpot', { dealId });
      return response;
    } catch (error) {
      logger.error('Failed to update deal in HubSpot', { dealId, error: error.message });
      throw error;
    }
  }

  /**
   * Get a deal by ID
   * @param {string} dealId - Deal ID
   * @param {Array} properties - Properties to fetch
   * @returns {Promise<Object>} Deal data
   */
  async getDeal(dealId, properties = []) {
    try {
      const response = await this.client.crm.deals.basicApi.getById(
        dealId,
        properties.length > 0 ? properties : undefined
      );
      return response;
    } catch (error) {
      logger.error('Failed to get deal from HubSpot', { dealId, error: error.message });
      throw error;
    }
  }

  /**
   * Search deals by property
   * @param {string} propertyName - Property name to search
   * @param {string} value - Value to match
   * @returns {Promise<Array>} Matching deals
   */
  async searchDeals(propertyName, value) {
    try {
      const response = await this.client.crm.deals.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName,
            operator: 'EQ',
            value
          }]
        }],
        properties: ['dealname', 'amount', 'dealstage', 'closedate', 'trackerrms_job_id', 'trackerrms_placement_id']
      });
      return response.results;
    } catch (error) {
      logger.error('Failed to search deals in HubSpot', { propertyName, value, error: error.message });
      throw error;
    }
  }

  // ============ CONTACTS ============

  /**
   * Create a contact in HubSpot
   * @param {Object} contactProperties - Contact properties
   * @returns {Promise<Object>} Created contact
   */
  async createContact(contactProperties) {
    try {
      const response = await this.client.crm.contacts.basicApi.create({
        properties: contactProperties
      });
      logger.info('Created contact in HubSpot', { contactId: response.id });
      return response;
    } catch (error) {
      logger.error('Failed to create contact in HubSpot', { error: error.message });
      throw error;
    }
  }

  /**
   * Update a contact in HubSpot
   * @param {string} contactId - Contact ID
   * @param {Object} contactProperties - Properties to update
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(contactId, contactProperties) {
    try {
      const response = await this.client.crm.contacts.basicApi.update(contactId, {
        properties: contactProperties
      });
      logger.info('Updated contact in HubSpot', { contactId });
      return response;
    } catch (error) {
      logger.error('Failed to update contact in HubSpot', { contactId, error: error.message });
      throw error;
    }
  }

  /**
   * Search contacts by email
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} Contact or null
   */
  async findContactByEmail(email) {
    try {
      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }]
      });
      return response.results.length > 0 ? response.results[0] : null;
    } catch (error) {
      logger.error('Failed to find contact by email in HubSpot', { email, error: error.message });
      throw error;
    }
  }

  // ============ ASSOCIATIONS ============

  /**
   * Associate a deal with a contact
   * @param {string} dealId - Deal ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} Association result
   */
  async associateDealWithContact(dealId, contactId) {
    try {
      const response = await this.client.crm.associations.v4.basicApi.create(
        'deals',
        dealId,
        'contacts',
        contactId,
        [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
      );
      logger.info('Associated deal with contact', { dealId, contactId });
      return response;
    } catch (error) {
      logger.error('Failed to associate deal with contact', { dealId, contactId, error: error.message });
      throw error;
    }
  }

  // ============ CUSTOM PROPERTIES ============

  /**
   * Create a custom property for deals
   * @param {Object} propertyDefinition - Property definition
   * @returns {Promise<Object>} Created property
   */
  async createDealProperty(propertyDefinition) {
    try {
      const response = await this.client.crm.properties.coreApi.create('deals', {
        name: propertyDefinition.name,
        label: propertyDefinition.label,
        type: propertyDefinition.type || 'string',
        fieldType: propertyDefinition.fieldType || 'text',
        groupName: propertyDefinition.groupName || 'dealinformation',
        description: propertyDefinition.description || ''
      });
      logger.info('Created deal property in HubSpot', { propertyName: propertyDefinition.name });
      return response;
    } catch (error) {
      // Property might already exist - check for 409 status
      const statusCode = error.code || error.status || error.response?.status;
      if (statusCode === 409) {
        logger.info('Deal property already exists', { propertyName: propertyDefinition.name });
        return null;
      }
      logger.error('Failed to create deal property in HubSpot', { propertyName: propertyDefinition.name, error: error.message });
      throw error;
    }
  }

  /**
   * Ensure TrackerRMS custom properties exist
   * @returns {Promise<void>}
   */
  async ensureCustomProperties() {
    const properties = [
      { name: 'trackerrms_job_id', label: 'TrackerRMS Job ID', type: 'string', fieldType: 'text' },
      { name: 'trackerrms_placement_id', label: 'TrackerRMS Placement ID', type: 'string', fieldType: 'text' },
      { name: 'trackerrms_service_line', label: 'TrackerRMS Service Line', type: 'string', fieldType: 'text' },
      { name: 'trackerrms_revenue', label: 'TrackerRMS Revenue', type: 'number', fieldType: 'number' },
      { name: 'trackerrms_margin', label: 'TrackerRMS Margin', type: 'number', fieldType: 'number' },
      { name: 'trackerrms_placement_date', label: 'TrackerRMS Placement Date', type: 'date', fieldType: 'date' },
      { name: 'trackerrms_velocity_score', label: 'Placement Velocity Score', type: 'number', fieldType: 'number' },
      { name: 'trackerrms_roi_score', label: 'ROI Score', type: 'number', fieldType: 'number' }
    ];

    for (const property of properties) {
      try {
        await this.createDealProperty(property);
      } catch (error) {
        logger.warn('Could not create property', { property: property.name, error: error.message });
      }
    }
  }
}

module.exports = HubSpotService;
