# Task Runner

A simple yet powerful web-based task runner API for executing and managing local scripts. Built with Node.js, Express, and supports production deployment with PM2.

## Features

- **Script Execution**: Run local scripts with custom arguments
- **Process Management**: Stop running scripts, list active processes
- **Status Monitoring**: Get detailed server and task status information
- **Security**: Basic authentication protection
- **Production Ready**: Can be deployed with global PM2 installation or other process managers
- **Testing**: Vitest integration for unit testing
- **Code Quality**: Standard.js for linting and code formatting

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/zxdong262/task-runner.git
   cd task-runner
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

## Environment Configuration

The following environment variables can be configured in the `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| HOST | Server hostname | localhost |
| PORT | Server port | 3000 |
| AUTH_USER | Basic auth username | admin |
| AUTH_PASSWORD | Basic auth password | password123 |
| LOG_LEVEL | Log level | info |

## Usage

### Development

Start the server in development mode:
```bash
npm start
```

### Production

For production deployment, you can use global PM2 installation with the provided configuration file:
```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Start the application with the pm2.config.js configuration
pm2 start pm2.yml

# Stop the application
pm2 stop task-runner

# Restart the application
pm2 restart task-runner

# View logs
pm2 logs task-runner

# List all processes
pm2 list
```

The `pm2.config.js` file includes production-ready configurations like:
- Application name and script path
- Auto-restart settings
- Memory management
- Logging configuration
- Environment variables

Alternatively, you can use a process manager of your choice to ensure the application runs continuously in production.

### API Endpoints

All endpoints require basic authentication.

#### Run a Script
```
POST /api/scripts/run
Content-Type: application/json

{
  "script": "./test-script.js",
  "args": ["arg1", "arg2"],
  "oneTime": false
}
```

Parameters:

- `script` (required): Path to the script to run
- `args` (optional): Array of arguments to pass to the script
- `oneTime` (optional): If true, run synchronously and return result (not tracked). If false or omitted, run asynchronously (tracked). Default: false

#### Stop a Script

```http
POST /api/scripts/stop/:id
```

#### List Running Scripts

```http
GET /api/scripts
```

#### Get Server Status

```http
GET /api/status
```

#### Health Check

```http
GET /health
```

## Testing

Run tests with Vitest:
```bash
npm test
```

## Code Quality

Lint the code:
```bash
npm run lint
```

Auto-fix linting issues:
```bash
npm run fix
```

## Example

Test scripts are included in the tests directory: `tests/test-script.js` (for async execution) and `tests/test-one-time.js` (for sync oneTime execution).

To run the async test script:
```bash
# Using the API
curl -X POST -u admin:password123 -H "Content-Type: application/json" \
  -d '{"script": "./tests/test-script.js", "args": ["test-arg"]}' \
  http://localhost:3000/api/scripts/run
```

To run the test script in oneTime mode (synchronous execution):

```bash
# Using the API with oneTime parameter
curl -X POST -u admin:password123 -H "Content-Type: application/json" \
  -d '{"script": "./tests/test-one-time.js", "args": ["test-arg"], "oneTime": true}' \
  http://localhost:3000/api/scripts/run
```

## License

MIT
