# Subber Proxy

A robust Express.js proxy server designed for easy deployment on Render.

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Package Manager**: Bun
- **Framework**: Express.js
- **Key Dependencies**:
  - `http-proxy-middleware`: Core proxy functionality
  - `helmet`: Security headers
  - `morgan`: HTTP request logging
  - `cors`: Cross-Origin Resource Sharing support
  - `dotenv`: Environment variable management

## Features

- Secure proxy server with proper error handling
- Configurable target URL via environment variables
- Path rewriting (e.g., `/api/users` → `/users` on the target server)
- Health check endpoint (`/health`)
- Production-ready configuration for Render deployment
- Development mode with auto-restart

## Setup Instructions

### Prerequisites

- Node.js v18 or higher
- Bun package manager

### Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd subber-proxy
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Create a `.env` file from the sample:
   ```bash
   cp sample.env .env
   ```

4. Modify the `.env` file with your specific configuration:
   ```
   PORT=3000
   NODE_ENV=development
   TARGET_URL=http://your-target-api.com
   ```

5. Start the development server:
   ```bash
   bun run dev
   ```

The server will start on the specified port (default: 3000) and automatically restart when you make changes to the code.

### Production Deployment on Render

1. Create a new Web Service on Render.

2. Connect your GitHub repository.

3. Use the following settings:
   - **Environment**: Node
   - **Build Command**: `bun install`
   - **Start Command**: `bun run start`

4. Add the following environment variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render assigns this port automatically)
   - `TARGET_URL`: Your target API URL

5. Deploy the service.

Alternatively, you can use the included `render.yaml` file for Infrastructure as Code deployment:

1. Push your code to GitHub.
2. In the Render dashboard, go to "Blueprints".
3. Connect your repository and deploy using the YAML configuration.

## API Usage

### Proxy Endpoints

All requests to `/api/*` will be proxied to your target server with the `/api` prefix removed.

Example:
- Request to: `https://your-proxy.onrender.com/api/users`
- Proxied to: `http://your-target-api.com/users`

### Health Check

- `GET /health`: Returns the current status of the proxy server

## Environment Variables

| Variable    | Description                                | Default               |
|-------------|--------------------------------------------|----------------------|
| PORT        | Port on which the server runs              | 3000                 |
| NODE_ENV    | Environment (development/production)       | -                    |
| TARGET_URL  | URL to which requests will be proxied      | http://localhost:8080 |

## License

ISC
