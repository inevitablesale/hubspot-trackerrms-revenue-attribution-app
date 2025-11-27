/**
 * Unit tests for DashboardService
 */
const DashboardService = require('../../src/dashboards/dashboard-service');

describe('DashboardService', () => {
  let dashboardService;

  beforeEach(() => {
    dashboardService = new DashboardService();
  });

  describe('getServiceLineAttributionData', () => {
    it('should aggregate revenue by service line', () => {
      const placements = [
        { serviceLine: 'IT', revenue: 10000, margin: 2000 },
        { serviceLine: 'IT', revenue: 15000, margin: 3000 },
        { serviceLine: 'Healthcare', revenue: 20000, margin: 5000 }
      ];

      const data = dashboardService.getServiceLineAttributionData(placements);

      expect(data.summary.totalRevenue).toBe(45000);
      expect(data.summary.totalMargin).toBe(10000);
      expect(data.summary.totalPlacements).toBe(3);
      expect(data.serviceLines).toHaveLength(2);
    });

    it('should calculate revenue percentages', () => {
      const placements = [
        { serviceLine: 'IT', revenue: 50000, margin: 10000 },
        { serviceLine: 'Healthcare', revenue: 50000, margin: 12000 }
      ];

      const data = dashboardService.getServiceLineAttributionData(placements);

      const itLine = data.serviceLines.find(l => l.serviceLine === 'IT');
      expect(itLine.revenuePercentage).toBe(50);
    });

    it('should provide chart data', () => {
      const placements = [
        { serviceLine: 'IT', revenue: 10000, margin: 2000 }
      ];

      const data = dashboardService.getServiceLineAttributionData(placements);

      expect(data.chartData).toBeDefined();
      expect(data.chartData.labels).toContain('IT');
      expect(data.chartData.revenue).toContain(10000);
    });
  });

  describe('getPlacementVelocityData', () => {
    it('should calculate velocity statistics by service line', () => {
      const placements = [
        {
          serviceLine: 'IT',
          startDate: '2024-01-05T00:00:00Z',
          job: { createdAt: '2024-01-01T00:00:00Z' }
        },
        {
          serviceLine: 'IT',
          startDate: '2024-01-10T00:00:00Z',
          job: { createdAt: '2024-01-01T00:00:00Z' }
        }
      ];

      const data = dashboardService.getPlacementVelocityData(placements);

      expect(data.summary).toBeDefined();
      expect(data.summary.overallAverageVelocity).toBeGreaterThan(0);
      expect(data.byServiceLine).toHaveLength(1);
      expect(data.byServiceLine[0].serviceLine).toBe('IT');
    });

    it('should provide velocity trend data', () => {
      const placements = [
        {
          startDate: '2024-01-15T00:00:00Z',
          job: { createdAt: '2024-01-01T00:00:00Z' }
        },
        {
          startDate: '2024-02-15T00:00:00Z',
          job: { createdAt: '2024-02-01T00:00:00Z' }
        }
      ];

      const data = dashboardService.getPlacementVelocityData(placements);

      expect(data.trend).toBeDefined();
      expect(data.trend.length).toBeGreaterThan(0);
    });

    it('should include score distribution', () => {
      const placements = [
        {
          startDate: '2024-01-01T00:00:00Z',
          job: { createdAt: '2024-01-01T00:00:00Z' }
        }
      ];

      const data = dashboardService.getPlacementVelocityData(placements);

      expect(data.distribution).toBeDefined();
      expect(data.distribution).toHaveProperty('excellent (90-100)');
      expect(data.distribution).toHaveProperty('poor (0-24)');
    });
  });

  describe('getROIDashboardData', () => {
    it('should calculate overall ROI metrics', () => {
      const placements = [
        {
          revenue: 10000,
          margin: 2000,
          attribution: { marketingCost: 500, salesCost: 300 }
        },
        {
          revenue: 15000,
          margin: 4000,
          attribution: { marketingCost: 600, salesCost: 400 }
        }
      ];

      const data = dashboardService.getROIDashboardData(placements);

      expect(data.summary.totalRevenue).toBe(25000);
      expect(data.summary.totalMargin).toBe(6000);
      expect(data.summary.totalCost).toBe(1800);
      expect(data.summary.overallROI).toBeGreaterThan(0);
    });

    it('should break down ROI by service line', () => {
      const placements = [
        {
          serviceLine: 'IT',
          revenue: 10000,
          margin: 2000
        },
        {
          serviceLine: 'Healthcare',
          revenue: 15000,
          margin: 4000
        }
      ];

      const data = dashboardService.getROIDashboardData(placements);

      expect(data.byServiceLine).toHaveLength(2);
      expect(data.byServiceLine.map(l => l.serviceLine)).toContain('IT');
      expect(data.byServiceLine.map(l => l.serviceLine)).toContain('Healthcare');
    });
  });

  describe('getExecutiveDashboardData', () => {
    it('should combine all dashboard data', () => {
      const placements = [
        {
          serviceLine: 'IT',
          revenue: 10000,
          margin: 2000,
          startDate: '2024-01-15T00:00:00Z',
          job: { createdAt: '2024-01-01T00:00:00Z' }
        }
      ];
      const jobs = [{ id: 'job-1' }, { id: 'job-2' }];

      const data = dashboardService.getExecutiveDashboardData(placements, jobs);

      expect(data.serviceLineAttribution).toBeDefined();
      expect(data.placementVelocity).toBeDefined();
      expect(data.roi).toBeDefined();
      expect(data.overview).toBeDefined();
      expect(data.overview.totalJobs).toBe(2);
      expect(data.overview.totalPlacements).toBe(1);
      expect(data.overview.fillRate).toBe(50);
    });
  });

  describe('calculateScoreDistribution', () => {
    it('should distribute scores into buckets', () => {
      const scores = [100, 95, 80, 60, 30, 10];

      const distribution = dashboardService.calculateScoreDistribution(scores);

      expect(distribution['excellent (90-100)']).toBe(2);
      expect(distribution['good (75-89)']).toBe(1);
      expect(distribution['average (50-74)']).toBe(1);
      expect(distribution['below_average (25-49)']).toBe(1);
      expect(distribution['poor (0-24)']).toBe(1);
    });

    it('should handle empty scores array', () => {
      const distribution = dashboardService.calculateScoreDistribution([]);

      expect(distribution['excellent (90-100)']).toBe(0);
      expect(distribution['poor (0-24)']).toBe(0);
    });
  });
});
