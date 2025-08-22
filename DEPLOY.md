# Pathfind AWS Deployment Guide

This guide walks you through deploying the Pathfind application to AWS using ECS Fargate.

## Architecture Overview

The deployment uses:
- **AWS ECS Fargate** for serverless container hosting
- **Application Load Balancer (ALB)** for traffic distribution
- **ECR** for Docker image registry
- **VPC with public/private subnets** for network isolation
- **Auto-scaling** based on CPU/memory metrics
- **CloudWatch** for logging and monitoring

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Docker** installed locally
4. **Terraform** (optional, for infrastructure as code)
5. **Git** (optional, for CI/CD)

## Quick Start Deployment

### Option 1: Automated Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd pathfind
   ```

2. **Set up infrastructure**
   ```bash
   # Copy and edit terraform variables
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   # Edit terraform/terraform.tfvars with your JWT secret
   
   # Run infrastructure setup
   ./scripts/setup-infrastructure.sh
   ```

3. **Deploy the application**
   ```bash
   ./scripts/deploy.sh
   ```

4. **Access your application**
   - The script will output your application URL
   - Format: `http://<load-balancer-dns>.amazonaws.com`

### Option 2: Manual Deployment

1. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and region
   ```

2. **Create infrastructure with Terraform**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

3. **Build and push Docker image**
   ```bash
   # Get your AWS account ID
   AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
   AWS_REGION=us-east-1
   
   # Build image
   docker build -t pathfind:latest .
   
   # Login to ECR
   aws ecr get-login-password --region $AWS_REGION | \
     docker login --username AWS --password-stdin \
     $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
   
   # Tag and push
   docker tag pathfind:latest \
     $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/pathfind:latest
   docker push \
     $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/pathfind:latest
   ```

4. **Update ECS service**
   ```bash
   aws ecs update-service \
     --cluster pathfind-cluster \
     --service pathfind-service \
     --force-new-deployment
   ```

## CI/CD with GitHub Actions

1. **Set up GitHub Secrets**
   Go to your GitHub repository Settings → Secrets and add:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `JWT_SECRET`

2. **Push to main branch**
   ```bash
   git add .
   git commit -m "Deploy to AWS"
   git push origin main
   ```

   The GitHub Action will automatically:
   - Build the Docker image
   - Push to ECR
   - Update ECS service

## Environment Variables

Configure these in your deployment:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | 3001 |
| `NODE_ENV` | Environment | production |
| `JWT_SECRET` | JWT signing secret | (required) |

## Scaling Configuration

The application auto-scales based on:
- **CPU Utilization**: Target 70%
- **Memory Utilization**: Target 80%
- **Min instances**: 2
- **Max instances**: 10

Modify in `terraform/main.tf` if needed.

## Monitoring

1. **CloudWatch Logs**
   ```bash
   aws logs tail /ecs/pathfind --follow
   ```

2. **ECS Service Status**
   ```bash
   aws ecs describe-services \
     --cluster pathfind-cluster \
     --services pathfind-service
   ```

3. **Application Health**
   - Check ALB target health in AWS Console
   - Monitor CloudWatch metrics

## Cost Optimization

Estimated monthly costs (varies by region):
- **2x Fargate tasks** (256 CPU, 512 MB): ~$18
- **Application Load Balancer**: ~$25
- **NAT Gateway**: ~$45
- **Data transfer**: Variable

Total: ~$90-120/month

### Cost-saving tips:
1. Use Fargate Spot for non-production
2. Reduce task count during low traffic
3. Consider using EC2 instead of Fargate for predictable workloads
4. Use CloudFront for static assets

## Troubleshooting

### Container fails to start
```bash
# Check logs
aws logs get-log-events \
  --log-group-name /ecs/pathfind \
  --log-stream-name <stream-name>
```

### Service not reachable
1. Check security groups allow traffic on port 80/443
2. Verify ALB target health
3. Check ECS service events

### Deployment stuck
```bash
# Force new deployment
aws ecs update-service \
  --cluster pathfind-cluster \
  --service pathfind-service \
  --force-new-deployment \
  --desired-count 2
```

## Security Considerations

1. **Secrets Management**
   - Use AWS Secrets Manager for production
   - Rotate JWT secret regularly
   - Never commit secrets to git

2. **Network Security**
   - Application runs in private subnets
   - ALB in public subnets only
   - Security groups restrict traffic

3. **Container Security**
   - Non-root user in container
   - Minimal Alpine Linux base image
   - Regular security scanning with ECR

## Cleanup

To remove all resources:
```bash
cd terraform
terraform destroy
```

## Next Steps

1. **Add a database**: Consider RDS or DynamoDB
2. **Add Redis**: For session management
3. **Configure domain**: Route 53 with SSL certificate
4. **Enable CDN**: CloudFront for better performance
5. **Set up monitoring**: CloudWatch dashboards and alarms

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review ECS service events
3. Verify security group rules
4. Check IAM permissions

## Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)