# EduPass Deployment Guide

This guide covers multiple deployment strategies for the EduPass application.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [Traditional Server Deployment](#traditional-server-deployment)
- [Cloud Platform Deployment](#cloud-platform-deployment)
- [Post-Deployment Configuration](#post-deployment-configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

### System Requirements
- **Node.js**: v18.x or higher
- **PostgreSQL**: v14.x or higher
- **Docker** (optional): v20.x or higher
- **Docker Compose** (optional): v2.x or higher
- **PM2** (optional): For process management

### Stellar Account Requirements
1. Create an issuer account on Stellar (testnet or mainnet)
2. Deploy Soroban smart contract and obtain contract ID
3. Fund issuer account with XLM for transaction fees

### SSL/TLS Certificate (Production)
- Obtain SSL certificates for your domain
- Recommended: Use Let's Encrypt with Certbot

## Deployment Options

### Option 1: Docker Deployment (Recommended)

Docker provides the easiest and most reliable deployment method with full stack orchestration.

#### Step 1: Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd EduPass

# Copy and configure environment file
cp .env.production.example .env.production
nano .env.production  # Edit with your values
```

#### Step 2: Configure Environment Variables

Edit `.env.production` with your actual values:

```bash
# Database
DB_PASSWORD=your_strong_password_here

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_generated_secret_here

# Stellar Configuration
STELLAR_NETWORK=public  # or testnet
ISSUER_PUBLIC_KEY=GXXXXXXXXXXXXX
ISSUER_SECRET_KEY=SXXXXXXXXXXXXX  # Keep this VERY secure!
SOROBAN_CONTRACT_ID=CXXXXXXXXXXXXX

# Frontend URL
FRONTEND_URL=https://yourdomain.com
VITE_API_URL=https://api.yourdomain.com/api
```

#### Step 3: Build and Deploy

```bash
# Build all containers
npm run docker:build

# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Check service health
docker-compose ps
```

#### Step 4: Initialize Database

The database will be automatically initialized with the SQL scripts on first run.

#### Step 5: Verify Deployment

```bash
# Test backend health
curl https://api.yourdomain.com/health

# Test frontend
curl https://yourdomain.com/health
```

### Option 2: Traditional Server Deployment

Deploy directly on a Linux server with PM2 process management.

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (for reverse proxy)
sudo apt install -y nginx
```

#### Step 2: Setup PostgreSQL

```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE edupass;
CREATE USER edupass WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE edupass TO edupass;
\q

# Run migrations
psql -U edupass -d edupass -f scripts/setup-database.sql
psql -U edupass -d edupass -f scripts/phase1-migration.sql
psql -U edupass -d edupass -f scripts/phase2-migration.sql
psql -U edupass -d edupass -f scripts/phase3-migration.sql
```

#### Step 3: Deploy Application

```bash
# Clone repository
cd /opt
sudo git clone <your-repo-url> edupass
cd edupass

# Install dependencies
npm run install:all

# Copy and configure environment
cp .env.production.example backend/.env
nano backend/.env  # Edit with your values

# Build frontend
cd frontend
npm run build
cd ..

# Start with PM2
npm run pm2:start

# Save PM2 configuration
pm2 save
pm2 startup  # Follow the instructions provided
```

#### Step 4: Configure Nginx

Create `/etc/nginx/sites-available/edupass`:

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    root /opt/edupass/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/edupass /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: Setup SSL with Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Certificates will auto-renew
```

### Option 3: Cloud Platform Deployment

#### AWS Deployment

**Using AWS Elastic Beanstalk:**

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-18 edupass

# Create environment
eb create edupass-prod

# Deploy
eb deploy
```

**Using AWS ECS (Docker):**

1. Push Docker images to ECR
2. Create ECS task definitions
3. Setup Application Load Balancer
4. Create ECS service

#### DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure build settings:
   - Build command: `npm run install:all && npm run build`
   - Run command: `npm run production:start`
3. Add environment variables from `.env.production.example`
4. Add PostgreSQL database component
5. Deploy

#### Heroku

```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create edupass-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
# ... add all other variables

# Deploy
git push heroku main
```

## Post-Deployment Configuration

### 1. Setup Issuer Account

```bash
# Create issuer account (if not already done)
node scripts/create-issuer.js
```

### 2. Deploy Smart Contract

```bash
# Install Soroban CLI
./scripts/install-soroban.sh  # or .bat for Windows

# Build contract
./scripts/build-contract.sh

# Deploy contract
./scripts/deploy-contract.sh

# Initialize contract with issuer
./scripts/soroban-initialize.sh
```

### 3. Create Initial Users

Access the application and register:
- Issuer account
- School accounts
- Test beneficiary account

### 4. Configure Asset Authorization

Enable asset controls on the Stellar issuer account as needed (clawback, authorization, etc.).

## Monitoring and Maintenance

### Application Logs

**Docker:**
```bash
npm run docker:logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

**PM2:**
```bash
npm run pm2:logs
pm2 logs edupass-backend
```

### Database Backups

**PostgreSQL Backup:**
```bash
# Create backup
pg_dump -U edupass edupass > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U edupass edupass < backup_20260304.sql
```

**Automated Backups (cron):**
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * pg_dump -U edupass edupass > /backups/edupass_$(date +\%Y\%m\%d).sql
```

### Health Monitoring

Setup monitoring for:
- API endpoint: `https://api.yourdomain.com/health`
- Frontend: `https://yourdomain.com/health`
- Database connectivity
- Stellar Horizon API connectivity
- Soroban RPC connectivity

**Recommended Tools:**
- Uptime monitoring: UptimeRobot, Pingdom
- Application monitoring: New Relic, Datadog
- Log aggregation: Loggly, Papertrail
- Error tracking: Sentry

### Security Updates

```bash
# Regular updates
npm audit
npm update

# Security patches
npm audit fix
```

### SSL Certificate Renewal

Certbot certificates auto-renew. Verify:

```bash
sudo certbot renew --dry-run
```

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check firewall rules

**2. Stellar Network Errors**
- Verify issuer account has XLM balance
- Check `STELLAR_NETWORK` setting (testnet vs public)
- Verify Horizon URL is accessible

**3. Smart Contract Not Found**
- Ensure `SOROBAN_CONTRACT_ID` is set correctly
- Verify contract was deployed to correct network
- Check RPC URL matches network

**4. Frontend Can't Connect to Backend**
- Verify `VITE_API_URL` in frontend environment
- Check CORS configuration in backend
- Verify reverse proxy/load balancer configuration

### Getting Help

- Check logs first: `npm run docker:logs` or `npm run pm2:logs`
- Review [API_REFERENCE.md](./API_REFERENCE.md)
- Check [GitHub Issues](your-repo-url/issues)

## Security Checklist

Before going live:

- [ ] Change all default passwords
- [ ] Generate strong JWT secret (32+ characters)
- [ ] Use HTTPS/SSL certificates
- [ ] Secure Stellar secret keys (consider using a vault)
- [ ] Enable database firewall rules
- [ ] Setup rate limiting
- [ ] Enable CORS only for your domain
- [ ] Setup regular backups
- [ ] Configure log rotation
- [ ] Enable security headers (already in Nginx config)
- [ ] Setup monitoring and alerts
- [ ] Review and test disaster recovery plan

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (Nginx, AWS ALB)
- Scale backend with PM2 cluster mode or Docker replicas
- Use managed PostgreSQL with read replicas
- Implement Redis for session storage

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize database queries
- Implement caching strategies

## Maintenance Windows

Plan for:
- Database migrations
- Security patches
- Dependency updates
- Stellar network upgrades
- Smart contract updates (if needed)

---

**Last Updated:** March 2026
**Version:** 1.0.0
