/**
 * Unit tests for OAuth service
 */
const oauth = require('../../src/auth/oauth');

describe('OAuth Service', () => {
  beforeEach(() => {
    // Clear token store before each test
    const portals = oauth.getConnectedPortals();
    portals.forEach(portalId => oauth.removeTokens(portalId));
  });

  describe('getAuthorizationUrl', () => {
    it('should generate a valid authorization URL', () => {
      const state = 'test-state';
      const url = oauth.getAuthorizationUrl(state);

      expect(url).toContain('app.hubspot.com');
      expect(url).toContain('client_id');
      expect(url).toContain('redirect_uri');
    });
  });

  describe('storeTokens', () => {
    it('should store tokens for a portal', () => {
      const portalId = 'test-portal';
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      };

      oauth.storeTokens(portalId, tokens);

      const stored = oauth.getTokens(portalId);
      expect(stored).toBeDefined();
      expect(stored.accessToken).toBe('access-token');
      expect(stored.refreshToken).toBe('refresh-token');
    });
  });

  describe('getTokens', () => {
    it('should return null for unknown portal', () => {
      const tokens = oauth.getTokens('unknown-portal');
      expect(tokens).toBeNull();
    });

    it('should return stored tokens', () => {
      const portalId = 'test-portal';
      oauth.storeTokens(portalId, {
        accessToken: 'test-token',
        refreshToken: 'refresh',
        expiresIn: 3600
      });

      const tokens = oauth.getTokens(portalId);
      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBe('test-token');
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for null tokens', () => {
      expect(oauth.isTokenExpired(null)).toBe(true);
    });

    it('should return true for tokens without expiresAt', () => {
      expect(oauth.isTokenExpired({})).toBe(true);
    });

    it('should return false for valid tokens', () => {
      const tokens = {
        expiresAt: Date.now() + 600000 // 10 minutes from now
      };
      expect(oauth.isTokenExpired(tokens)).toBe(false);
    });

    it('should return true for expired tokens', () => {
      const tokens = {
        expiresAt: Date.now() - 1000 // 1 second ago
      };
      expect(oauth.isTokenExpired(tokens)).toBe(true);
    });

    it('should consider tokens expired 5 minutes before actual expiry', () => {
      const tokens = {
        expiresAt: Date.now() + 240000 // 4 minutes from now (within 5 min buffer)
      };
      expect(oauth.isTokenExpired(tokens)).toBe(true);
    });
  });

  describe('removeTokens', () => {
    it('should remove tokens for a portal', () => {
      const portalId = 'test-portal';
      oauth.storeTokens(portalId, {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600
      });

      oauth.removeTokens(portalId);

      expect(oauth.getTokens(portalId)).toBeNull();
    });
  });

  describe('getConnectedPortals', () => {
    it('should return empty array when no portals connected', () => {
      const portals = oauth.getConnectedPortals();
      expect(portals).toEqual([]);
    });

    it('should return all connected portal IDs', () => {
      oauth.storeTokens('portal-1', { accessToken: 't1', refreshToken: 'r1', expiresIn: 3600 });
      oauth.storeTokens('portal-2', { accessToken: 't2', refreshToken: 'r2', expiresIn: 3600 });

      const portals = oauth.getConnectedPortals();

      expect(portals).toContain('portal-1');
      expect(portals).toContain('portal-2');
      expect(portals.length).toBe(2);
    });
  });
});
