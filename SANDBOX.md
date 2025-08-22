# AWS Sandbox Deployment Guide 🚀

Quick deployment guide for AWS sandbox/playground accounts with automatic cleanup.

## 🎯 Quick Start (2 minutes)

```bash
# Deploy to AWS Sandbox
./scripts/sandbox-deploy.sh

# That's it! Your app will be live in ~5 minutes
```

## 📋 What You Get

- **Minimal Cost**: ~$0.10-0.50 for 4-hour sandbox session
- **Quick Setup**: 5 minutes total deployment time
- **Auto-Cleanup**: Easy teardown before sandbox expires
- **Production-like**: Real AWS services (ECS, ALB, ECR)
- **WebSocket Support**: Real-time features work properly

## 🏗️ Architecture (Sandbox-Optimized)

```
Internet → ALB (Load Balancer) → ECS Fargate (1 container) → Your App
              ↓
         Default VPC (No NAT Gateway = $0)
```

### Resource Configuration:
- **1x ECS Task**: 256 CPU, 512 MB memory (minimum tier)
- **1x ALB**: Application Load Balancer
- **Default VPC**: No additional networking costs
- **CloudWatch Logs**: 1-day retention
- **ECR**: Auto-cleanup old images

## 📦 Prerequisites

1. **AWS Sandbox Account** (AWS Educate, A Cloud Guru, etc.)
2. **AWS CLI** configured with credentials
3. **Docker** installed and running
4. **Terraform** (optional, script will warn if missing)

## 🚀 Deployment Options

### Option 1: Fully Automated (Recommended)
```bash
# Deploy everything with one command
./scripts/sandbox-deploy.sh
```

### Option 2: Docker-Only (Skip Infrastructure)
```bash
# If infrastructure already exists
SKIP_INFRA=true ./scripts/sandbox-deploy.sh
```

### Option 3: Local Testing with Docker Compose
```bash
# Test locally with LocalStack (AWS simulator)
docker-compose -f docker-compose.sandbox.yml up

# Access at: http://localhost
```

## 🛠️ Manual Deployment Steps

If you prefer manual control:

```bash
# 1. Create infrastructure
cd terraform/sandbox
terraform init
terraform apply -auto-approve

# 2. Build and push Docker image
docker build -t pathfind:latest .
aws ecr get-login-password | docker login --username AWS --password-stdin [ECR_URL]
docker tag pathfind:latest [ECR_URL]:latest
docker push [ECR_URL]:latest

# 3. Deploy to ECS
aws ecs update-service \
  --cluster pathfind-sandbox-cluster \
  --service pathfind-sandbox-service \
  --force-new-deployment
```

## 🧹 Cleanup (Important!)

**Always cleanup before your sandbox expires:**

```bash
# Remove all AWS resources
./scripts/sandbox-cleanup.sh
```

Or manually with Terraform:
```bash
cd terraform/sandbox
terraform destroy -auto-approve
```

## 📊 Cost Breakdown

| Service | Hourly Cost | 4-Hour Session |
|---------|------------|----------------|
| Fargate (256/512) | ~$0.01 | ~$0.04 |
| ALB | ~$0.03 | ~$0.12 |
| Data Transfer | ~$0.01 | ~$0.04 |
| **Total** | **~$0.05** | **~$0.20** |

*Costs vary by region. us-east-1 is typically cheapest.*

## 🔍 Monitoring & Debugging

### View Application Logs
```bash
aws logs tail /ecs/pathfind-sandbox --follow
```

### Check Service Status
```bash
aws ecs describe-services \
  --cluster pathfind-sandbox-cluster \
  --services pathfind-sandbox-service
```

### Get Application URL
```bash
aws elbv2 describe-load-balancers \
  --names pathfind-sandbox-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

## ⚠️ Common Issues

### "Cannot pull container image"
- ECR repository might not exist
- Run the full deployment script: `./scripts/sandbox-deploy.sh`

### "Service not reachable"
- Wait 2-3 minutes after deployment
- Check ALB target health in AWS Console
- Verify security groups allow port 80

### "Terraform command not found"
- Install from: https://terraform.io/downloads
- Or use: `SKIP_INFRA=true ./scripts/sandbox-deploy.sh`

### "AWS credentials not configured"
```bash
aws configure
# Enter your Access Key ID and Secret Access Key
```

## 🎓 Learning Resources

### Understanding the Stack
1. **ECS Fargate**: Serverless containers
2. **ALB**: Load balancing and health checks
3. **ECR**: Docker image registry
4. **CloudWatch**: Logs and monitoring

### Next Steps After Sandbox
1. Add a database (RDS or DynamoDB)
2. Configure a custom domain
3. Add SSL certificate
4. Implement CI/CD pipeline
5. Scale to multiple containers

## 🔐 Security Notes

- Sandbox uses simplified security for testing
- JWT secret is hardcoded (fine for sandbox)
- No HTTPS (add ALB certificate for production)
- Default VPC used (create custom VPC for production)

## 💡 Tips for Sandbox Accounts

1. **A Cloud Guru Sandboxes**: 4-hour limit, auto-cleanup at expiry
2. **AWS Educate**: May have spending limits
3. **Personal Sandboxes**: Set billing alerts at $1
4. **Cleanup Reminder**: Set a timer for 3.5 hours

## 📝 Quick Commands Reference

```bash
# Deploy
./scripts/sandbox-deploy.sh

# View logs
aws logs tail /ecs/pathfind-sandbox --follow

# Get URL
terraform -chdir=terraform/sandbox output app_url

# Force redeploy
aws ecs update-service \
  --cluster pathfind-sandbox-cluster \
  --service pathfind-sandbox-service \
  --force-new-deployment

# Cleanup
./scripts/sandbox-cleanup.sh
```

## 🆘 Troubleshooting Checklist

- [ ] AWS CLI configured? (`aws sts get-caller-identity`)
- [ ] Docker running? (`docker ps`)
- [ ] In correct directory? (`pwd` should show pathfind)
- [ ] Terraform installed? (`terraform version`)
- [ ] Sandbox not expired? (check provider dashboard)

## 🎉 Success Indicators

When deployment succeeds, you'll see:
1. Green "Deployment Complete!" message
2. Application URL displayed
3. ECS service shows "RUNNING" state
4. ALB targets healthy
5. Can access app in browser

---

**Remember**: Always run `./scripts/sandbox-cleanup.sh` before your sandbox expires!