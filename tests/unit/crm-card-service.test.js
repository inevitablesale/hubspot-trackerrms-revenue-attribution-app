/**
 * Unit tests for CRMCardService
 */
const CRMCardService = require('../../src/crm-cards/crm-card-service');

describe('CRMCardService', () => {
  let crmCardService;

  beforeEach(() => {
    crmCardService = new CRMCardService();
  });

  describe('buildJobCard', () => {
    it('should build a valid job card with all properties', () => {
      const job = {
        id: 'job-123',
        title: 'Senior Developer',
        status: 'open',
        clientName: 'Acme Corp',
        location: 'Remote',
        serviceLine: 'IT',
        openDate: '2024-01-01',
        targetDate: '2024-02-01',
        billRate: 100,
        estimatedRevenue: 50000
      };

      const card = crmCardService.buildJobCard(job);

      expect(card.results).toBeDefined();
      expect(card.results.length).toBeGreaterThan(0);
      expect(card.results[0].id).toBe('job_details');
      expect(card.results[0].title).toBe('Job Details');
      expect(card.primaryAction).toBeDefined();
      expect(card.primaryAction.uri).toContain('job-123');
    });

    it('should include candidates section when candidates exist', () => {
      const job = {
        id: 'job-123',
        title: 'Developer',
        candidates: [
          { name: 'John Doe', status: 'Submitted' },
          { name: 'Jane Smith', status: 'Interview' }
        ]
      };

      const card = crmCardService.buildJobCard(job);

      const candidatesSection = card.results.find(s => s.id === 'candidates');
      expect(candidatesSection).toBeDefined();
      expect(candidatesSection.properties.length).toBe(2);
    });

    it('should handle missing optional fields', () => {
      const job = { id: 'job-123' };

      const card = crmCardService.buildJobCard(job);

      expect(card.results).toBeDefined();
      expect(card.results[0].topLevelProperties[0].value).toBe('N/A');
    });
  });

  describe('buildPlacementCard', () => {
    it('should build a valid placement card', () => {
      const placement = {
        id: 'placement-123',
        candidateName: 'John Doe',
        status: 'Active',
        jobTitle: 'Developer',
        clientName: 'Acme Corp',
        startDate: '2024-01-15',
        billRate: 100,
        payRate: 60,
        revenue: 25000,
        margin: 10000,
        marginPercentage: 40,
        hoursWorked: 250
      };

      const card = crmCardService.buildPlacementCard(placement);

      expect(card.results).toBeDefined();
      expect(card.results.length).toBeGreaterThanOrEqual(2);
      expect(card.results[0].id).toBe('placement_details');
      expect(card.results[1].id).toBe('revenue');
    });

    it('should include scores section when scores exist', () => {
      const placement = {
        id: 'placement-123',
        velocityScore: 85,
        roiScore: 75,
        overallScore: 80
      };

      const card = crmCardService.buildPlacementCard(placement);

      const scoresSection = card.results.find(s => s.id === 'scores');
      expect(scoresSection).toBeDefined();
      expect(scoresSection.properties.length).toBe(3);
    });
  });

  describe('buildAttributionCard', () => {
    it('should build a valid attribution card', () => {
      const attributionData = {
        totalRevenue: 100000,
        totalPlacements: 10,
        serviceLines: {
          IT: { placementCount: 5, totalRevenue: 60000 },
          Healthcare: { placementCount: 5, totalRevenue: 40000 }
        }
      };

      const card = crmCardService.buildAttributionCard(attributionData);

      expect(card.results).toBeDefined();
      expect(card.results[0].id).toBe('summary');
      expect(card.results[1].id).toBe('service_lines');
    });
  });

  describe('buildErrorCard', () => {
    it('should build an error card with message', () => {
      const message = 'Something went wrong';

      const card = crmCardService.buildErrorCard(message);

      expect(card.results).toBeDefined();
      expect(card.results[0].id).toBe('error');
      expect(card.results[0].properties[0].value).toBe(message);
    });
  });
});
