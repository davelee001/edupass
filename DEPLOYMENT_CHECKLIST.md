# 🚀 EduPass Deployment Checklist

Quick checklist to deploy EduPass to production.

## Pre-Deployment

### Environment Setup
- [ ] Copy `.env.production.example` to `.env`
- [ ] Generate JWT secret: `openssl rand -base64 32`
- [ ] Set strong database password
- [ ] Configure Stellar issuer keys
- [ ] Deploy Soroban contract and set contract ID
- [ ] Set `NODE_ENV=production`
- [ ] Configure frontend URL and API URL

### Security Review
- [ ] Review [SECURITY_CHECKLIST.md](./docs/SECURITY_CHECKLIST.md)
- [ ] Change all default passwords
- [ ] Verify no secrets in git history
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules

### Testing
- [ ] Run all tests: `npm test`
- [ ] Test locally with Docker: `npm run docker:up`
- [ ] Run health check: `./scripts/health-check.sh`
- [ ] Test on testnet before mainnet

## Deployment (Choose One Method)

### Option A: Docker (Recommended)
```bash
# Build and deploy
npm run docker:build
npm run docker:up

# Verify
npm run docker:logs
./scripts/health-check.sh
```

### Option B: PM2
```bash
# Start with PM2
npm run pm2:start

# Verify
npm run pm2:logs
pm2 monit
```

### Option C: Cloud Platform
- [ ] Follow platform-specific guide in [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)
- [ ] Configure environment variables in platform dashboard
- [ ] Enable auto-scaling if supported

## Post-Deployment

### Verify Services
- [ ] Backend health: `curl https://api.yourdomain.com/health`
- [ ] Frontend: `curl https://yourdomain.com/health`
- [ ] Database connectivity
- [ ] Stellar network connectivity

### Configure Monitoring
- [ ] Setup uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error tracking (Sentry, if using)
- [ ] Setup log aggregation
- [ ] Configure alerts for errors

### Backups
- [ ] Test backup script: `./scripts/backup.sh`
- [ ] Schedule daily backups (cron)
- [ ] Test restore procedure
- [ ] Store backups off-site

### Documentation
- [ ] Update README with production URLs
- [ ] Document any customizations
- [ ] Create runbook for team
- [ ] Document emergency contacts

## First Week Monitoring

### Daily Checks (First Week)
- [ ] Check application logs
- [ ] Monitor error rates
- [ ] Review transaction volume
- [ ] Check database size
- [ ] Verify backups completed

### Performance Monitoring
- [ ] API response times
- [ ] Database query performance
- [ ] Memory usage
- [ ] CPU usage
- [ ] Disk space

## Maintenance Schedule

### Daily
- [ ] Check error logs
- [ ] Verify backups

### Weekly
- [ ] Review security logs
- [ ] Check for dependency updates
- [ ] Review performance metrics

### Monthly
- [ ] Security audit review
- [ ] Database optimization
- [ ] Test disaster recovery
- [ ] Review and update documentation

## Emergency Contacts

**Technical Lead:** ________________
**DevOps:** ________________
**Security:** ________________
**On-Call Schedule:** ________________

## Rollback Plan

If something goes wrong:

```bash
# Docker
cd /opt/edupass
git checkout HEAD~1
docker-compose restart

# PM2
pm2 stop all
git checkout HEAD~1
pm2 restart all
```

## Success Criteria

Deployment is successful when:
- [ ] All health checks pass
- [ ] Users can login
- [ ] Credits can be issued
- [ ] Payments work end-to-end
- [ ] No errors in logs (last hour)
- [ ] Response times < 500ms
- [ ] Uptime > 99.9%

---

**Deployment Date:** ____________
**Deployed By:** ____________
**Version:** ____________
**Git Commit:** ____________

**Notes:**
