/**
 * Scoring service for placement velocity and ROI calculations
 */
const logger = require('../logger');

class ScoringService {
  /**
   * Calculate placement velocity score
   * Measures how quickly a job is filled (lower is better)
   * @param {Object} placement - Placement data
   * @param {Object} job - Associated job data
   * @returns {number} Velocity score (0-100)
   */
  calculateVelocityScore(placement, job) {
    if (!placement || !job) {
      return 0;
    }

    try {
      const jobCreatedDate = new Date(job.createdAt || job.openDate);
      const placementDate = new Date(placement.startDate || placement.createdAt);

      // Validate dates
      if (isNaN(jobCreatedDate.getTime()) || isNaN(placementDate.getTime())) {
        logger.warn('Invalid dates for velocity calculation', {
          jobDate: job.createdAt || job.openDate,
          placementDate: placement.startDate || placement.createdAt
        });
        return 0;
      }

      // Calculate days to fill - negative values indicate data issues
      const daysToFill = (placementDate - jobCreatedDate) / (1000 * 60 * 60 * 24);

      // Handle edge case where placement date is before job creation
      if (daysToFill < 0) {
        logger.warn('Placement date is before job creation date', {
          jobDate: jobCreatedDate.toISOString(),
          placementDate: placementDate.toISOString()
        });
        // Still calculate score but treat as same-day
        return 100;
      }

      // Scoring: 100 = filled same day, decreasing by 2 points per day
      // Minimum score of 10
      const score = Math.max(10, Math.min(100, 100 - (daysToFill * 2)));

      return Math.round(score);
    } catch (error) {
      logger.error('Error calculating velocity score', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate ROI score for a placement
   * @param {Object} placement - Placement with revenue data
   * @param {Object} attributionData - Marketing/sales attribution data
   * @returns {number} ROI score (0-100)
   */
  calculateROIScore(placement, attributionData = {}) {
    if (!placement) {
      return 0;
    }

    try {
      const revenue = placement.revenue || 0;
      const margin = placement.margin || 0;
      const marketingCost = attributionData.marketingCost || 0;
      const salesCost = attributionData.salesCost || 0;

      const totalCost = marketingCost + salesCost;

      if (totalCost === 0) {
        // If no cost data, base score on margin percentage
        const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0;
        return Math.min(100, Math.round(marginPercentage * 2));
      }

      // ROI = (Revenue - Cost) / Cost * 100
      const roi = ((revenue - totalCost) / totalCost) * 100;

      // Normalize to 0-100 scale (assuming 500% ROI = 100 score)
      const score = Math.min(100, Math.max(0, Math.round(roi / 5)));

      return score;
    } catch (error) {
      logger.error('Error calculating ROI score', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate service line attribution
   * @param {Array} placements - List of placements
   * @returns {Object} Attribution data by service line
   */
  calculateServiceLineAttribution(placements) {
    const attribution = {};

    for (const placement of placements) {
      const serviceLine = placement.serviceLine || 'Unassigned';

      if (!attribution[serviceLine]) {
        attribution[serviceLine] = {
          serviceLine,
          placementCount: 0,
          totalRevenue: 0,
          totalMargin: 0,
          averageVelocity: 0,
          velocityScores: []
        };
      }

      attribution[serviceLine].placementCount++;
      attribution[serviceLine].totalRevenue += placement.revenue || 0;
      attribution[serviceLine].totalMargin += placement.margin || 0;

      if (placement.velocityScore) {
        attribution[serviceLine].velocityScores.push(placement.velocityScore);
      }
    }

    // Calculate averages
    for (const serviceLine in attribution) {
      const data = attribution[serviceLine];
      if (data.velocityScores.length > 0) {
        data.averageVelocity = Math.round(
          data.velocityScores.reduce((a, b) => a + b, 0) / data.velocityScores.length
        );
      }
      delete data.velocityScores; // Clean up internal tracking
    }

    return attribution;
  }

  /**
   * Calculate overall placement score combining velocity and ROI
   * @param {number} velocityScore - Velocity score (0-100)
   * @param {number} roiScore - ROI score (0-100)
   * @param {Object} weights - Custom weights for scoring
   * @returns {number} Combined score (0-100)
   */
  calculateOverallScore(velocityScore, roiScore, weights = { velocity: 0.4, roi: 0.6 }) {
    const normalizedWeights = this.normalizeWeights(weights);

    return Math.round(
      (velocityScore * normalizedWeights.velocity) +
      (roiScore * normalizedWeights.roi)
    );
  }

  /**
   * Normalize weights to sum to 1
   * @param {Object} weights - Raw weights
   * @returns {Object} Normalized weights
   */
  normalizeWeights(weights) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);

    if (total === 0) {
      return { velocity: 0.5, roi: 0.5 };
    }

    return {
      velocity: (weights.velocity || 0) / total,
      roi: (weights.roi || 0) / total
    };
  }

  /**
   * Batch calculate scores for multiple placements
   * @param {Array} placements - List of placements with job data
   * @returns {Array} Placements with calculated scores
   */
  batchCalculateScores(placements) {
    return placements.map(placement => {
      const velocityScore = this.calculateVelocityScore(placement, placement.job);
      const roiScore = this.calculateROIScore(placement, placement.attribution);
      const overallScore = this.calculateOverallScore(velocityScore, roiScore);

      return {
        ...placement,
        velocityScore,
        roiScore,
        overallScore
      };
    });
  }

  /**
   * Get score tier based on score value
   * @param {number} score - Score value (0-100)
   * @returns {string} Score tier
   */
  getScoreTier(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'average';
    if (score >= 25) return 'below_average';
    return 'poor';
  }
}

module.exports = ScoringService;
