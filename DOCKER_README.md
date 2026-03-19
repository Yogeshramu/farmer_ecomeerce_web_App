# Docker Setup Instructions

## Quick Start with Docker

1. **Install Docker & Docker Compose**
   - Download from: https://www.docker.com/products/docker-desktop

2. **Run the Application**
   ```bash
   # Start everything (PostgreSQL + App)
   npm run docker:up
   
   # Or manually:
   docker-compose up --build
   ```

3. **Access the Application**
   - App: http://localhost:3000
   - Database: localhost:5432

4. **Stop the Application**
   ```bash
   npm run docker:down
   ```

5. **Reset Database (Fresh Start)**
   ```bash
   npm run docker:reset
   ```

## Login Credentials
- **Farmer**: farmer@test.com / password123
- **Consumer**: consumer@test.com / password123

## What Docker Does
- Creates PostgreSQL database automatically
- Runs database migrations
- Seeds sample data (crops, users, orders)
- Starts the Next.js application
- Everything runs in isolated containers

## Troubleshooting
- If port 3000 is busy: `docker-compose down` first
- If database issues: `npm run docker:reset`
- View logs: `docker-compose logs app`