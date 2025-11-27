/**
 * Jest test setup
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.HUBSPOT_CLIENT_ID = 'test-client-id';
process.env.HUBSPOT_CLIENT_SECRET = 'test-client-secret';
process.env.HUBSPOT_REDIRECT_URI = 'http://localhost:3000/oauth/callback';
process.env.TRACKERRMS_API_KEY = 'test-api-key';
process.env.TRACKERRMS_BASE_URL = 'https://api.trackerrms.com/v1';
process.env.SESSION_SECRET = 'test-session-secret';

// Increase timeout for async tests
jest.setTimeout(10000);

// Mock console methods to reduce test noise
const consoleMethods = ['log', 'info', 'warn', 'error'];
consoleMethods.forEach(method => {
  jest.spyOn(console, method).mockImplementation(() => {});
});

// Restore console after all tests
afterAll(() => {
  consoleMethods.forEach(method => {
    // eslint-disable-next-line no-console
    console[method].mockRestore();
  });
});
