# MindLink Deployment Guide

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Git
- Domain name (for production)

## Environment Setup

### Development Environment

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see SETUP.md)
4. Start MongoDB
5. Run the application

### Production Environment

#### Backend Deployment

**Option 1: Railway**
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

**Option 2: Heroku**
1. Install Heroku CLI
2. Create Heroku app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set KEY=value`
4. Deploy: `git push heroku main`

**Option 3: DigitalOcean App Platform**
1. Connect GitHub repository
2. Configure build and run commands
3. Set environment variables
4. Deploy

#### Frontend Deployment

**Option 1: Netlify**
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `frontend/dist`
4. Set environment variables
5. Deploy

**Option 2: Vercel**
1. Connect GitHub repository
2. Set framework preset: Vite
3. Set build command: `npm run build`
4. Set output directory: `frontend/dist`
5. Deploy

**Option 3: GitHub Pages**
1. Enable GitHub Pages in repository settings
2. Set source to GitHub Actions
3. Create workflow file for deployment

## Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mindlink
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://your-frontend-domain.com
REDIS_URL=redis://your-redis-url (optional)
```

### Frontend (.env)
```env
VITE_API_URL=https://your-api-domain.com
GEMINI_API_KEY=your-gemini-api-key
```

## Database Setup

### MongoDB Atlas
1. Create MongoDB Atlas account
2. Create cluster
3. Get connection string
4. Update MONGODB_URI in environment variables

### Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Create database: `mindlink`
4. Set MONGODB_URI to local connection string

## SSL/HTTPS Setup

### Using Cloudflare
1. Add domain to Cloudflare
2. Enable SSL/TLS encryption
3. Set SSL mode to "Full (strict)"

### Using Let's Encrypt
1. Install Certbot
2. Generate SSL certificate
3. Configure web server to use certificate

## Monitoring and Logging

### Application Monitoring
- Use services like New Relic, DataDog, or Sentry
- Monitor API response times
- Track error rates
- Set up alerts

### Log Management
- Use services like LogRocket, Loggly, or Papertrail
- Centralize logs from all services
- Set up log rotation
- Monitor for errors and anomalies

## Performance Optimization

### Backend
- Enable compression
- Use Redis for session storage
- Implement rate limiting
- Use connection pooling for database

### Frontend
- Enable gzip compression
- Use CDN for static assets
- Implement lazy loading
- Optimize images

## Security Considerations

1. **Environment Variables**: Never commit .env files
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Configure CORS properly
4. **Rate Limiting**: Implement rate limiting
5. **Input Validation**: Validate all inputs
6. **Authentication**: Use secure JWT tokens
7. **Database**: Use connection strings with authentication

## Backup Strategy

### Database Backups
- Set up automated MongoDB backups
- Test backup restoration process
- Store backups in multiple locations

### Code Backups
- Use Git for version control
- Keep multiple remote repositories
- Tag releases for easy rollback

## Scaling Considerations

### Horizontal Scaling
- Use load balancers
- Implement Redis for session sharing
- Use database clustering
- Consider microservices architecture

### Vertical Scaling
- Monitor resource usage
- Upgrade server specifications
- Optimize database queries
- Use caching strategies

## Troubleshooting

### Common Issues
1. **CORS Errors**: Check FRONTEND_URL configuration
2. **Database Connection**: Verify MONGODB_URI
3. **JWT Errors**: Check JWT_SECRET configuration
4. **Build Failures**: Check Node.js version and dependencies

### Debugging
1. Check application logs
2. Monitor database connections
3. Verify environment variables
4. Test API endpoints manually

## Maintenance

### Regular Tasks
- Update dependencies
- Monitor security vulnerabilities
- Review and rotate secrets
- Clean up old logs
- Monitor performance metrics

### Updates
- Test updates in staging environment
- Use blue-green deployment
- Have rollback plan ready
- Monitor after deployment
