/**
 * CRM Card service for HubSpot UI extensions
 */

class CRMCardService {
  /**
   * Generate a job card response for HubSpot
   * @param {Object} job - TrackerRMS job data
   * @returns {Object} CRM card response
   */
  buildJobCard(job) {
    const sections = [];

    // Primary section with job details
    sections.push({
      id: 'job_details',
      title: 'Job Details',
      topLevelProperties: [
        {
          label: 'Job Title',
          value: job.title || 'N/A',
          dataType: 'STRING'
        },
        {
          label: 'Status',
          value: job.status || 'N/A',
          dataType: 'STATUS'
        }
      ],
      properties: [
        { label: 'Job ID', value: job.id, dataType: 'STRING' },
        { label: 'Client', value: job.clientName || 'N/A', dataType: 'STRING' },
        { label: 'Location', value: job.location || 'N/A', dataType: 'STRING' },
        { label: 'Service Line', value: job.serviceLine || 'N/A', dataType: 'STRING' },
        { label: 'Open Date', value: job.openDate || job.createdAt, dataType: 'DATE' },
        { label: 'Target Date', value: job.targetDate || 'N/A', dataType: 'DATE' },
        { label: 'Bill Rate', value: `$${job.billRate || 0}/hr`, dataType: 'STRING' },
        { label: 'Estimated Revenue', value: job.estimatedRevenue, dataType: 'CURRENCY' }
      ]
    });

    // Candidates section if available
    if (job.candidates && job.candidates.length > 0) {
      sections.push({
        id: 'candidates',
        title: 'Candidates',
        properties: job.candidates.slice(0, 5).map((candidate, index) => ({
          label: `Candidate ${index + 1}`,
          value: `${candidate.name} - ${candidate.status}`,
          dataType: 'STRING'
        }))
      });
    }

    // Actions
    const actions = [
      {
        type: 'IFRAME',
        width: 890,
        height: 748,
        uri: `https://app.trackerrms.com/jobs/${job.id}`,
        label: 'View in TrackerRMS'
      }
    ];

    return {
      results: sections,
      primaryAction: actions[0],
      secondaryActions: actions.slice(1)
    };
  }

  /**
   * Generate a placement card response for HubSpot
   * @param {Object} placement - TrackerRMS placement data
   * @returns {Object} CRM card response
   */
  buildPlacementCard(placement) {
    const sections = [];

    // Primary section with placement details
    sections.push({
      id: 'placement_details',
      title: 'Placement Details',
      topLevelProperties: [
        {
          label: 'Candidate',
          value: placement.candidateName || 'N/A',
          dataType: 'STRING'
        },
        {
          label: 'Status',
          value: placement.status || 'Active',
          dataType: 'STATUS'
        }
      ],
      properties: [
        { label: 'Placement ID', value: placement.id, dataType: 'STRING' },
        { label: 'Job', value: placement.jobTitle || 'N/A', dataType: 'STRING' },
        { label: 'Client', value: placement.clientName || 'N/A', dataType: 'STRING' },
        { label: 'Start Date', value: placement.startDate, dataType: 'DATE' },
        { label: 'End Date', value: placement.endDate || 'Ongoing', dataType: 'DATE' },
        { label: 'Bill Rate', value: `$${placement.billRate || 0}/hr`, dataType: 'STRING' },
        { label: 'Pay Rate', value: `$${placement.payRate || 0}/hr`, dataType: 'STRING' }
      ]
    });

    // Revenue section
    sections.push({
      id: 'revenue',
      title: 'Revenue',
      properties: [
        { label: 'Total Revenue', value: placement.revenue, dataType: 'CURRENCY' },
        { label: 'Total Margin', value: placement.margin, dataType: 'CURRENCY' },
        { label: 'Margin %', value: `${placement.marginPercentage || 0}%`, dataType: 'STRING' },
        { label: 'Hours Worked', value: placement.hoursWorked || 0, dataType: 'NUMERIC' }
      ]
    });

    // Scores section
    if (placement.velocityScore || placement.roiScore) {
      sections.push({
        id: 'scores',
        title: 'Performance Scores',
        properties: [
          { label: 'Velocity Score', value: placement.velocityScore || 0, dataType: 'NUMERIC' },
          { label: 'ROI Score', value: placement.roiScore || 0, dataType: 'NUMERIC' },
          { label: 'Overall Score', value: placement.overallScore || 0, dataType: 'NUMERIC' }
        ]
      });
    }

    const actions = [
      {
        type: 'IFRAME',
        width: 890,
        height: 748,
        uri: `https://app.trackerrms.com/placements/${placement.id}`,
        label: 'View in TrackerRMS'
      }
    ];

    return {
      results: sections,
      primaryAction: actions[0],
      secondaryActions: actions.slice(1)
    };
  }

  /**
   * Generate a revenue attribution card
   * @param {Object} attributionData - Service line attribution data
   * @returns {Object} CRM card response
   */
  buildAttributionCard(attributionData) {
    const sections = [];

    // Summary section
    sections.push({
      id: 'summary',
      title: 'Revenue Attribution Summary',
      topLevelProperties: [
        {
          label: 'Total Revenue',
          value: attributionData.totalRevenue,
          dataType: 'CURRENCY'
        },
        {
          label: 'Total Placements',
          value: attributionData.totalPlacements,
          dataType: 'NUMERIC'
        }
      ],
      properties: []
    });

    // Service line breakdown
    if (attributionData.serviceLines) {
      sections.push({
        id: 'service_lines',
        title: 'By Service Line',
        properties: Object.entries(attributionData.serviceLines).map(([line, data]) => ({
          label: line,
          value: `${data.placementCount} placements - $${data.totalRevenue}`,
          dataType: 'STRING'
        }))
      });
    }

    return {
      results: sections,
      primaryAction: null,
      secondaryActions: []
    };
  }

  /**
   * Build error card response
   * @param {string} message - Error message
   * @returns {Object} CRM card error response
   */
  buildErrorCard(message) {
    return {
      results: [{
        id: 'error',
        title: 'Error',
        properties: [{
          label: 'Message',
          value: message,
          dataType: 'STRING'
        }]
      }],
      primaryAction: null,
      secondaryActions: []
    };
  }
}

module.exports = CRMCardService;
