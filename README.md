# HubSpot TrackerRMS Revenue Attribution App

HubSpot app that connects TrackerRMS Jobs and Placements to HubSpot Deals, generating end-to-end revenue attribution across marketing, sales, delivery, and service lines. Provides true closed-loop reporting and ROI dashboards for recruiting, staffing, and consulting operations.

## Features

- **OAuth 2.0 Authentication**: Secure connection to HubSpot with automatic token refresh
- **TrackerRMS Sync**: Sync Jobs and Placements from TrackerRMS to HubSpot Deals
- **CRM Cards**: Display TrackerRMS job and placement data directly in HubSpot
- **Timeline Events**: Track placement milestones and revenue updates in HubSpot
- **Revenue Attribution**: Map placement revenue to Deals with service-line attribution
- **Scoring System**: Calculate placement velocity and ROI scores
- **Dashboards**: Service-line attribution, velocity, and ROI analytics
- **Webhooks**: Real-time sync on job and placement updates

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- HubSpot Developer Account
- TrackerRMS API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/inevitablesale/hubspot-trackerrms-revenue-attribution-app.git
cd hubspot-trackerrms-revenue-attribution-app

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# HUBSPOT_CLIENT_ID=your_client_id
# HUBSPOT_CLIENT_SECRET=your_client_secret
# TRACKERRMS_API_KEY=your_api_key

# Start the server
npm start
```

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix lint errors
npm run lint:fix
```

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/oauth/authorize` | GET | Initiate OAuth flow |
| `/oauth/callback` | GET | OAuth callback handler |
| `/oauth/status` | GET | Check connection status |
| `/oauth/logout` | POST | Disconnect from HubSpot |

### Sync Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sync/jobs` | POST | Sync all jobs from TrackerRMS |
| `/api/sync/placements` | POST | Sync all placements from TrackerRMS |
| `/api/sync/revenue` | POST | Sync revenue data for placements |
| `/api/sync/full` | POST | Full sync (jobs, placements, revenue) |
| `/api/sync/status` | GET | Get sync status |

### CRM Cards

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/crm-cards/job/:jobId` | GET | Get job card data |
| `/api/crm-cards/placement/:placementId` | GET | Get placement card data |
| `/api/crm-cards/attribution/:dealId` | GET | Get attribution card data |

### Dashboards

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboards/attribution` | GET | Service line attribution data |
| `/api/dashboards/velocity` | GET | Placement velocity metrics |
| `/api/dashboards/roi` | GET | ROI dashboard data |
| `/api/dashboards/executive` | GET | Combined executive dashboard |

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/hubspot/deals` | POST | Handle HubSpot deal updates |
| `/api/webhooks/trackerrms/jobs` | POST | Handle TrackerRMS job updates |
| `/api/webhooks/trackerrms/placements` | POST | Handle TrackerRMS placement updates |

## HubSpot Custom Properties

The app creates the following custom properties on Deals:

| Property | Type | Description |
|----------|------|-------------|
| `trackerrms_job_id` | String | TrackerRMS Job ID |
| `trackerrms_placement_id` | String | TrackerRMS Placement ID |
| `trackerrms_service_line` | String | Service Line / Category |
| `trackerrms_revenue` | Number | Total Revenue |
| `trackerrms_margin` | Number | Total Margin |
| `trackerrms_placement_date` | Date | Placement Start Date |
| `trackerrms_velocity_score` | Number | Placement Velocity Score (0-100) |
| `trackerrms_roi_score` | Number | ROI Score (0-100) |

## Scoring System

### Velocity Score

Measures how quickly a job is filled (100 = same day, decreasing by 2 points per day).

- **Excellent (90-100)**: Filled within 5 days
- **Good (75-89)**: Filled within 12 days
- **Average (50-74)**: Filled within 25 days
- **Below Average (25-49)**: Filled within 37 days
- **Poor (0-24)**: More than 37 days

### ROI Score

Calculated based on revenue, margin, and attribution costs.

- When cost data is available: `min(100, (Revenue - Cost) / Cost * 100 / 5)`
- When no cost data: `min(100, Margin % * 2)`

## Project Structure

```
├── src/
│   ├── api/                    # REST API routes
│   │   ├── crm-card-routes.js
│   │   ├── dashboard-routes.js
│   │   ├── sync-routes.js
│   │   └── webhook-routes.js
│   ├── auth/                   # OAuth authentication
│   │   ├── oauth.js
│   │   └── routes.js
│   ├── crm-cards/              # HubSpot CRM card builders
│   │   └── crm-card-service.js
│   ├── dashboards/             # Dashboard data aggregation
│   │   └── dashboard-service.js
│   ├── middleware/             # Express middleware
│   │   └── auth.js
│   ├── scoring/                # Scoring algorithms
│   │   └── scoring-service.js
│   ├── services/               # External API clients
│   │   ├── hubspot-service.js
│   │   └── trackerrms-client.js
│   ├── sync/                   # Sync logic
│   │   └── sync-service.js
│   ├── timeline/               # Timeline events
│   │   └── timeline-service.js
│   ├── app.js                  # Express app setup
│   ├── config.js               # Configuration
│   ├── index.js                # Entry point
│   └── logger.js               # Winston logger
├── tests/
│   ├── integration/            # Integration tests
│   │   └── api.test.js
│   └── unit/                   # Unit tests
│       ├── crm-card-service.test.js
│       ├── dashboard-service.test.js
│       ├── oauth.test.js
│       └── scoring-service.test.js
├── .env.example                # Environment template
├── .eslintrc.json              # ESLint configuration
├── .gitignore
├── jest.config.js              # Jest configuration
├── package.json
└── README.md
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HUBSPOT_CLIENT_ID` | Yes | HubSpot app client ID |
| `HUBSPOT_CLIENT_SECRET` | Yes | HubSpot app client secret |
| `HUBSPOT_APP_ID` | No | HubSpot app ID |
| `HUBSPOT_REDIRECT_URI` | No | OAuth callback URL (default: http://localhost:3000/oauth/callback) |
| `HUBSPOT_SCOPES` | No | OAuth scopes (default: crm.objects.deals.read,crm.objects.deals.write) |
| `TRACKERRMS_API_KEY` | Yes | TrackerRMS API key |
| `TRACKERRMS_BASE_URL` | No | TrackerRMS API base URL |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production/test) |
| `SESSION_SECRET` | Yes | Session encryption key |
| `LOG_LEVEL` | No | Logging level (default: info) |

## License

MIT
