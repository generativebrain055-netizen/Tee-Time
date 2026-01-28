# TeeTime AWS Deployment Guide

Complete guide to deploying the TeeTime backend on AWS with HTTPS.

---

## Quick Start (Recommended: ALB + ACM)

The easiest and most secure approach uses AWS Application Load Balancer with AWS Certificate Manager for free, auto-renewing SSL certificates.

### Architecture

```
Internet → Route 53 (DNS)
    ↓
Application Load Balancer (HTTPS:443)
    ↓ (HTTP:3000)
EC2 Instance (Node.js Backend)
    ↓
Supabase (PostgreSQL)
```

---

## Step-by-Step Deployment

### 1. Launch EC2 Instance

1. Go to **EC2 Dashboard** → **Launch Instance**
2. Choose **Amazon Linux 2023** or **Ubuntu 22.04 LTS**
3. Select instance type: **t3.small** (minimum for production)
4. Configure security group:
   - SSH (22) - Your IP only
   - HTTP (3000) - Load Balancer security group only
5. Create or select a key pair for SSH access

### 2. Install Node.js on EC2

```bash
# Connect to your instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### 3. Deploy Backend Code

```bash
# Clone repository (or use CodeDeploy/GitHub Actions)
git clone https://github.com/your-repo/teetime.git
cd teetime/backend

# Install dependencies
npm install --production

# Create environment file
nano .env
```

### 4. Configure Environment Variables

Create `.env` file with production settings:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Leave SSL paths empty - ALB handles HTTPS
SSL_KEY_PATH=
SSL_CERT_PATH=

# Supabase (from your Supabase dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid (for Email)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Apple OAuth
APPLE_CLIENT_ID=com.yourapp.bundle
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# CORS - Your mobile app and web domains
ALLOWED_ORIGINS=https://yourdomain.com,exp://192.168.1.x:8081

# Analytics
ENABLE_ANALYTICS=true
```

### 5. Set Up PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
pm2 start server.js --name teetime-api

# Set up auto-restart on reboot
pm2 startup
pm2 save

# View logs
pm2 logs teetime-api
```

### 6. Request SSL Certificate (ACM)

1. Go to **AWS Certificate Manager**
2. Click **Request a certificate**
3. Choose **Request a public certificate**
4. Enter your domain: `api.yourdomain.com`
5. Choose **DNS validation**
6. Add the CNAME record to your DNS (Route 53 or external)
7. Wait for validation (usually 5-30 minutes)

### 7. Create Application Load Balancer

1. Go to **EC2** → **Load Balancers** → **Create Load Balancer**
2. Choose **Application Load Balancer**
3. Configure:
   - Name: `teetime-alb`
   - Scheme: Internet-facing
   - IP address type: IPv4

4. **Listeners:**
   - HTTPS:443 → Forward to target group
   - HTTP:80 → Redirect to HTTPS:443

5. **Security Groups:**
   - Allow HTTPS (443) from 0.0.0.0/0
   - Allow HTTP (80) from 0.0.0.0/0

6. **Select ACM Certificate** from Step 6

7. **Create Target Group:**
   - Target type: Instances
   - Protocol: HTTP
   - Port: 3000
   - Health check path: `/health`
   - Register your EC2 instance

### 8. Configure DNS (Route 53)

1. Go to **Route 53** → **Hosted zones**
2. Select your domain
3. Create record:
   - Record name: `api`
   - Record type: A
   - Alias: Yes
   - Route traffic to: Application Load Balancer
   - Select your ALB

### 9. Update Mobile App

Update your mobile app's API configuration:

```typescript
// TTSGolfApp/config/api.ts
export const API_URL = "https://api.yourdomain.com";
```

---

## Verification Checklist

After deployment, verify everything works:

```bash
# Health check
curl https://api.yourdomain.com/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":...}
```

- [ ] Health endpoint returns 200
- [ ] SSL certificate is valid (check in browser)
- [ ] Mobile app can authenticate
- [ ] OAuth (Google/Apple) works
- [ ] SMS/Email notifications send

---

## Security Checklist

- [ ] EC2 security group only allows ALB traffic on port 3000
- [ ] SSH access restricted to your IP
- [ ] Environment variables set (not hardcoded)
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] ALLOWED_ORIGINS configured for your domains only
- [ ] Database credentials in environment variables
- [ ] PM2 running with auto-restart enabled

---

## Monitoring & Maintenance

### CloudWatch Logs

```bash
# Install CloudWatch agent
sudo yum install amazon-cloudwatch-agent

# Configure to send PM2 logs to CloudWatch
```

### SSL Certificate Renewal

AWS Certificate Manager automatically renews certificates. No action needed.

### Application Updates

```bash
# Pull latest code
cd ~/teetime/backend
git pull origin main

# Install any new dependencies
npm install --production

# Restart application
pm2 restart teetime-api
```

---

## Troubleshooting

### Server not starting

```bash
pm2 logs teetime-api --lines 50
```

### Health check failing

- Verify security group allows ALB → EC2 on port 3000
- Check target group health in EC2 console

### SSL certificate not working

- Ensure DNS validation is complete in ACM
- Check ALB listener is using the correct certificate

### OAuth not working

- Verify redirect URIs in Google/Apple developer consoles
- Check CORS configuration in environment variables

---

## Cost Estimate (Monthly)

| Service         | Estimated Cost |
| --------------- | -------------- |
| EC2 t3.small    | ~$15           |
| ALB             | ~$18           |
| Route 53        | ~$0.50         |
| ACM Certificate | Free           |
| **Total**       | **~$35/month** |

---

## Support

For issues with deployment, check:

1. PM2 logs: `pm2 logs teetime-api`
2. CloudWatch logs (if configured)
3. ALB target group health status
4. EC2 instance system logs
