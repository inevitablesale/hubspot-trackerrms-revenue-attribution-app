/**
 * Integration tests for API endpoints
 */
const request = require('supertest');
const app = require('../../src/app');

describe('API Integration Tests', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBeDefined();
    });
  });

  describe('GET /', () => {
    it('should return app info', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('HubSpot TrackerRMS Revenue Attribution App');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.auth).toBe('/oauth/authorize');
    });
  });

  describe('GET /dashboard', () => {
    it('should redirect to oauth when not authenticated', async () => {
      const response = await request(app).get('/dashboard');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/oauth/authorize');
    });
  });

  describe('OAuth routes', () => {
    describe('GET /oauth/authorize', () => {
      it('should redirect to HubSpot OAuth', async () => {
        const response = await request(app).get('/oauth/authorize');

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain('app.hubspot.com');
      });
    });

    describe('GET /oauth/status', () => {
      it('should return not connected when no session', async () => {
        const response = await request(app).get('/oauth/status');

        expect(response.status).toBe(200);
        expect(response.body.connected).toBe(false);
        expect(response.body.portalId).toBeNull();
      });
    });
  });

  describe('Sync routes', () => {
    describe('POST /api/sync/jobs', () => {
      it('should require authentication', async () => {
        const response = await request(app).post('/api/sync/jobs');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Authentication required');
      });
    });

    describe('POST /api/sync/placements', () => {
      it('should require authentication', async () => {
        const response = await request(app).post('/api/sync/placements');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/sync/revenue', () => {
      it('should require authentication', async () => {
        const response = await request(app).post('/api/sync/revenue');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/sync/full', () => {
      it('should require authentication', async () => {
        const response = await request(app).post('/api/sync/full');

        expect(response.status).toBe(401);
      });
    });
  });

  describe('CRM Card routes', () => {
    describe('GET /api/crm-cards/job/:jobId', () => {
      it('should return error card when no API key provided', async () => {
        const response = await request(app).get('/api/crm-cards/job/test-job-id');

        expect(response.status).toBe(200);
        expect(response.body.results).toBeDefined();
        expect(response.body.results[0].id).toBe('error');
      });
    });

    describe('GET /api/crm-cards/placement/:placementId', () => {
      it('should return error card when no API key provided', async () => {
        const response = await request(app).get('/api/crm-cards/placement/test-placement-id');

        expect(response.status).toBe(200);
        expect(response.body.results[0].id).toBe('error');
      });
    });
  });

  describe('Dashboard routes', () => {
    describe('GET /api/dashboards/attribution', () => {
      it('should require TrackerRMS API key', async () => {
        const response = await request(app).get('/api/dashboards/attribution');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('TrackerRMS API key required');
      });
    });

    describe('GET /api/dashboards/velocity', () => {
      it('should require TrackerRMS API key', async () => {
        const response = await request(app).get('/api/dashboards/velocity');

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/dashboards/roi', () => {
      it('should require TrackerRMS API key', async () => {
        const response = await request(app).get('/api/dashboards/roi');

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/dashboards/executive', () => {
      it('should require TrackerRMS API key', async () => {
        const response = await request(app).get('/api/dashboards/executive');

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Webhook routes', () => {
    describe('POST /api/webhooks/hubspot/deals', () => {
      it('should accept webhook requests', async () => {
        const response = await request(app)
          .post('/api/webhooks/hubspot/deals')
          .send({
            subscriptionType: 'deal.creation',
            objectId: '123'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should handle array of events', async () => {
        const response = await request(app)
          .post('/api/webhooks/hubspot/deals')
          .send([
            { subscriptionType: 'deal.creation', objectId: '123' },
            { subscriptionType: 'deal.propertyChange', objectId: '456' }
          ]);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/webhooks/trackerrms/jobs', () => {
      it('should require portal ID and API key', async () => {
        const response = await request(app)
          .post('/api/webhooks/trackerrms/jobs')
          .send({ event: 'job.created', data: { id: 'job-123' } });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Missing portal ID');
      });
    });

    describe('POST /api/webhooks/trackerrms/placements', () => {
      it('should require portal ID and API key', async () => {
        const response = await request(app)
          .post('/api/webhooks/trackerrms/placements')
          .send({ event: 'placement.created', data: { id: 'placement-123' } });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });
  });
});
