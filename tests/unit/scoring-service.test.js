/**
 * Unit tests for ScoringService
 */
const ScoringService = require('../../src/scoring/scoring-service');

describe('ScoringService', () => {
  let scoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  describe('calculateVelocityScore', () => {
    it('should return 100 for same-day placement', () => {
      const job = { createdAt: '2024-01-01T00:00:00Z' };
      const placement = { startDate: '2024-01-01T00:00:00Z' };

      const score = scoringService.calculateVelocityScore(placement, job);

      expect(score).toBe(100);
    });

    it('should decrease score for longer fill times', () => {
      const job = { createdAt: '2024-01-01T00:00:00Z' };
      const placement = { startDate: '2024-01-15T00:00:00Z' };

      const score = scoringService.calculateVelocityScore(placement, job);

      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(10);
    });

    it('should return minimum score of 10 for very long fill times', () => {
      const job = { createdAt: '2024-01-01T00:00:00Z' };
      const placement = { startDate: '2024-06-01T00:00:00Z' };

      const score = scoringService.calculateVelocityScore(placement, job);

      expect(score).toBe(10);
    });

    it('should return 0 for null placement or job', () => {
      expect(scoringService.calculateVelocityScore(null, {})).toBe(0);
      expect(scoringService.calculateVelocityScore({}, null)).toBe(0);
    });
  });

  describe('calculateROIScore', () => {
    it('should calculate score based on margin percentage when no cost data', () => {
      const placement = { revenue: 10000, margin: 2000 };

      const score = scoringService.calculateROIScore(placement);

      expect(score).toBe(40); // 20% margin * 2 = 40
    });

    it('should calculate score based on ROI when cost data exists', () => {
      const placement = { revenue: 10000, margin: 3000 };
      const attribution = { marketingCost: 1000, salesCost: 500 };

      const score = scoringService.calculateROIScore(placement, attribution);

      // ROI = (10000 - 1500) / 1500 * 100 = 566.67%
      // Score = min(100, 566.67/5) = 100
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for null placement', () => {
      expect(scoringService.calculateROIScore(null)).toBe(0);
    });
  });

  describe('calculateServiceLineAttribution', () => {
    it('should group placements by service line', () => {
      const placements = [
        { serviceLine: 'IT', revenue: 5000, margin: 1000 },
        { serviceLine: 'IT', revenue: 7000, margin: 1500 },
        { serviceLine: 'Healthcare', revenue: 8000, margin: 2000 }
      ];

      const attribution = scoringService.calculateServiceLineAttribution(placements);

      expect(attribution.IT.placementCount).toBe(2);
      expect(attribution.IT.totalRevenue).toBe(12000);
      expect(attribution.Healthcare.placementCount).toBe(1);
      expect(attribution.Healthcare.totalRevenue).toBe(8000);
    });

    it('should handle placements with no service line', () => {
      const placements = [
        { revenue: 5000, margin: 1000 }
      ];

      const attribution = scoringService.calculateServiceLineAttribution(placements);

      expect(attribution.Unassigned).toBeDefined();
      expect(attribution.Unassigned.placementCount).toBe(1);
    });
  });

  describe('calculateOverallScore', () => {
    it('should combine velocity and ROI scores with default weights', () => {
      const velocityScore = 80;
      const roiScore = 60;

      const overall = scoringService.calculateOverallScore(velocityScore, roiScore);

      // Default: 40% velocity, 60% ROI
      // 0.4 * 80 + 0.6 * 60 = 32 + 36 = 68
      expect(overall).toBe(68);
    });

    it('should respect custom weights', () => {
      const velocityScore = 100;
      const roiScore = 50;
      const weights = { velocity: 0.5, roi: 0.5 };

      const overall = scoringService.calculateOverallScore(velocityScore, roiScore, weights);

      expect(overall).toBe(75);
    });
  });

  describe('getScoreTier', () => {
    it('should return excellent for scores >= 90', () => {
      expect(scoringService.getScoreTier(90)).toBe('excellent');
      expect(scoringService.getScoreTier(100)).toBe('excellent');
    });

    it('should return good for scores 75-89', () => {
      expect(scoringService.getScoreTier(75)).toBe('good');
      expect(scoringService.getScoreTier(89)).toBe('good');
    });

    it('should return average for scores 50-74', () => {
      expect(scoringService.getScoreTier(50)).toBe('average');
      expect(scoringService.getScoreTier(74)).toBe('average');
    });

    it('should return below_average for scores 25-49', () => {
      expect(scoringService.getScoreTier(25)).toBe('below_average');
      expect(scoringService.getScoreTier(49)).toBe('below_average');
    });

    it('should return poor for scores < 25', () => {
      expect(scoringService.getScoreTier(0)).toBe('poor');
      expect(scoringService.getScoreTier(24)).toBe('poor');
    });
  });

  describe('batchCalculateScores', () => {
    it('should calculate scores for multiple placements', () => {
      const placements = [
        {
          startDate: '2024-01-05T00:00:00Z',
          revenue: 10000,
          margin: 2000,
          job: { createdAt: '2024-01-01T00:00:00Z' }
        },
        {
          startDate: '2024-01-10T00:00:00Z',
          revenue: 15000,
          margin: 4000,
          job: { createdAt: '2024-01-01T00:00:00Z' }
        }
      ];

      const results = scoringService.batchCalculateScores(placements);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('velocityScore');
      expect(results[0]).toHaveProperty('roiScore');
      expect(results[0]).toHaveProperty('overallScore');
      expect(results[1]).toHaveProperty('velocityScore');
      expect(results[1]).toHaveProperty('roiScore');
      expect(results[1]).toHaveProperty('overallScore');
    });
  });
});
