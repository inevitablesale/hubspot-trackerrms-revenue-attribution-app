/**
 * Dashboard service for analytics and reporting
 */
const ScoringService = require('../scoring/scoring-service');

class DashboardService {
  constructor() {
    this.scoringService = new ScoringService();
  }

  /**
   * Generate service line attribution dashboard data
   * @param {Array} placements - List of placements
   * @returns {Object} Dashboard data
   */
  getServiceLineAttributionData(placements) {
    const attribution = this.scoringService.calculateServiceLineAttribution(placements);

    const totalRevenue = Object.values(attribution)
      .reduce((sum, line) => sum + line.totalRevenue, 0);

    const totalMargin = Object.values(attribution)
      .reduce((sum, line) => sum + line.totalMargin, 0);

    const totalPlacements = placements.length;

    return {
      summary: {
        totalRevenue,
        totalMargin,
        totalPlacements,
        averageMarginPercentage: totalRevenue > 0
          ? Math.round((totalMargin / totalRevenue) * 100)
          : 0
      },
      serviceLines: Object.values(attribution).map(line => ({
        ...line,
        revenuePercentage: totalRevenue > 0
          ? Math.round((line.totalRevenue / totalRevenue) * 100)
          : 0
      })),
      chartData: {
        labels: Object.keys(attribution),
        revenue: Object.values(attribution).map(l => l.totalRevenue),
        placements: Object.values(attribution).map(l => l.placementCount)
      }
    };
  }

  /**
   * Generate placement velocity dashboard data
   * @param {Array} placements - List of placements with job data
   * @returns {Object} Dashboard data
   */
  getPlacementVelocityData(placements) {
    const placementsWithScores = this.scoringService.batchCalculateScores(placements);

    const velocityByServiceLine = {};
    const velocityTrend = [];

    for (const placement of placementsWithScores) {
      const serviceLine = placement.serviceLine || 'Unassigned';

      if (!velocityByServiceLine[serviceLine]) {
        velocityByServiceLine[serviceLine] = {
          scores: [],
          count: 0
        };
      }

      velocityByServiceLine[serviceLine].scores.push(placement.velocityScore);
      velocityByServiceLine[serviceLine].count++;

      // Add to trend data (by month)
      const month = new Date(placement.startDate || placement.createdAt)
        .toISOString().substring(0, 7);

      const existingMonth = velocityTrend.find(t => t.month === month);
      if (existingMonth) {
        existingMonth.scores.push(placement.velocityScore);
      } else {
        velocityTrend.push({ month, scores: [placement.velocityScore] });
      }
    }

    // Calculate averages
    const serviceLineStats = Object.entries(velocityByServiceLine).map(([name, data]) => ({
      serviceLine: name,
      averageVelocity: Math.round(
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      ),
      placementCount: data.count,
      tier: this.scoringService.getScoreTier(
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      )
    }));

    const trendData = velocityTrend
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(t => ({
        month: t.month,
        averageVelocity: Math.round(
          t.scores.reduce((a, b) => a + b, 0) / t.scores.length
        )
      }));

    const overallAverage = placementsWithScores.length > 0
      ? Math.round(
        placementsWithScores.reduce((sum, p) => sum + p.velocityScore, 0) /
          placementsWithScores.length
      )
      : 0;

    return {
      summary: {
        overallAverageVelocity: overallAverage,
        tier: this.scoringService.getScoreTier(overallAverage),
        totalPlacements: placements.length
      },
      byServiceLine: serviceLineStats,
      trend: trendData,
      distribution: this.calculateScoreDistribution(
        placementsWithScores.map(p => p.velocityScore)
      )
    };
  }

  /**
   * Generate ROI dashboard data
   * @param {Array} placements - List of placements with attribution data
   * @returns {Object} Dashboard data
   */
  getROIDashboardData(placements) {
    const placementsWithScores = this.scoringService.batchCalculateScores(placements);

    const totalRevenue = placements.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const totalMargin = placements.reduce((sum, p) => sum + (p.margin || 0), 0);
    const totalMarketingCost = placements.reduce(
      (sum, p) => sum + (p.attribution?.marketingCost || 0), 0
    );
    const totalSalesCost = placements.reduce(
      (sum, p) => sum + (p.attribution?.salesCost || 0), 0
    );

    const totalCost = totalMarketingCost + totalSalesCost;
    const overallROI = totalCost > 0
      ? Math.round(((totalRevenue - totalCost) / totalCost) * 100)
      : 0;

    const averageROIScore = placementsWithScores.length > 0
      ? Math.round(
        placementsWithScores.reduce((sum, p) => sum + p.roiScore, 0) /
          placementsWithScores.length
      )
      : 0;

    // ROI by service line
    const roiByServiceLine = {};
    for (const placement of placementsWithScores) {
      const serviceLine = placement.serviceLine || 'Unassigned';

      if (!roiByServiceLine[serviceLine]) {
        roiByServiceLine[serviceLine] = {
          revenue: 0,
          cost: 0,
          scores: []
        };
      }

      roiByServiceLine[serviceLine].revenue += placement.revenue || 0;
      roiByServiceLine[serviceLine].cost +=
        (placement.attribution?.marketingCost || 0) +
        (placement.attribution?.salesCost || 0);
      roiByServiceLine[serviceLine].scores.push(placement.roiScore);
    }

    const serviceLineStats = Object.entries(roiByServiceLine).map(([name, data]) => ({
      serviceLine: name,
      revenue: data.revenue,
      cost: data.cost,
      roi: data.cost > 0
        ? Math.round(((data.revenue - data.cost) / data.cost) * 100)
        : 0,
      averageScore: Math.round(
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      )
    }));

    return {
      summary: {
        totalRevenue,
        totalMargin,
        totalCost,
        overallROI,
        averageROIScore,
        tier: this.scoringService.getScoreTier(averageROIScore)
      },
      byServiceLine: serviceLineStats,
      costBreakdown: {
        marketing: totalMarketingCost,
        sales: totalSalesCost
      },
      distribution: this.calculateScoreDistribution(
        placementsWithScores.map(p => p.roiScore)
      )
    };
  }

  /**
   * Get combined executive dashboard data
   * @param {Array} placements - List of placements
   * @param {Array} jobs - List of jobs
   * @returns {Object} Executive dashboard data
   */
  getExecutiveDashboardData(placements, jobs = []) {
    return {
      serviceLineAttribution: this.getServiceLineAttributionData(placements),
      placementVelocity: this.getPlacementVelocityData(placements),
      roi: this.getROIDashboardData(placements),
      overview: {
        totalJobs: jobs.length,
        totalPlacements: placements.length,
        fillRate: jobs.length > 0
          ? Math.round((placements.length / jobs.length) * 100)
          : 0,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Calculate score distribution for histogram
   * @param {Array} scores - Array of score values
   * @returns {Object} Distribution data
   */
  calculateScoreDistribution(scores) {
    const buckets = {
      'excellent (90-100)': 0,
      'good (75-89)': 0,
      'average (50-74)': 0,
      'below_average (25-49)': 0,
      'poor (0-24)': 0
    };

    for (const score of scores) {
      if (score >= 90) buckets['excellent (90-100)']++;
      else if (score >= 75) buckets['good (75-89)']++;
      else if (score >= 50) buckets['average (50-74)']++;
      else if (score >= 25) buckets['below_average (25-49)']++;
      else buckets['poor (0-24)']++;
    }

    return buckets;
  }
}

module.exports = DashboardService;
