#!/bin/bash

# Sandbox Deployment Script for Pathfind
# Quick deployment for AWS sandbox/playground accounts

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}=====================================${NC}"
echo -e "${MAGENTA}   Pathfind Sandbox Deployment 🚀    ${NC}"
echo -e "${MAGENTA}=====================================${NC}"

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
SKIP_INFRA=${SKIP_INFRA:-false}

# Check for sandbox mode confirmation
echo -e "${YELLOW}⚠️  SANDBOX MODE DEPLOYMENT${NC}"
echo -e "This deployment is optimized for AWS sandbox/playground accounts:"
echo -e "• Uses default VPC (no NAT Gateway costs)"
echo -e "• Single container instance (minimal resources)"
echo -e "• 1-day log retention"
echo -e "• Auto-cleanup policies enabled"
echo -e ""
echo -e "${YELLOW}Continue? (yes/no)${NC}"
read -r response
if [[ "$response" != "yes" ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 0
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not installed${NC}"
    echo -e "Install: https://aws.amazon.com/cli/"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not installed${NC}"
    echo -e "Install: https://www.docker.com/get-started"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo -e "Run: aws configure"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓ AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✓ Region: ${AWS_REGION}${NC}"

# Step 1: Infrastructure (if not skipped)
if [ "$SKIP_INFRA" != "true" ]; then
    echo -e "${BLUE}Step 1: Setting up infrastructure...${NC}"
    
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}❌ Terraform not installed${NC}"
        echo -e "${YELLOW}Install from: https://www.terraform.io/downloads${NC}"
        echo -e "${YELLOW}Or skip infrastructure with: SKIP_INFRA=true ./scripts/sandbox-deploy.sh${NC}"
        exit 1
    fi
    
    cd terraform/sandbox
    
    # Initialize Terraform
    echo -e "${YELLOW}Initializing Terraform...${NC}"
    terraform init -upgrade
    
    # Apply infrastructure
    echo -e "${YELLOW}Creating infrastructure (this takes ~3-5 minutes)...${NC}"
    terraform apply -auto-approve -var="aws_region=${AWS_REGION}"
    
    # Get outputs
    ECR_URL=$(terraform output -raw ecr_repository_url)
    APP_URL=$(terraform output -raw app_url)
    
    cd ../..
else
    echo -e "${YELLOW}Skipping infrastructure setup (SKIP_INFRA=true)${NC}"
    ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/pathfind-sandbox"
fi

# Step 2: Build Docker image
echo -e "${BLUE}Step 2: Building Docker image...${NC}"
docker build -t pathfind:latest .
echo -e "${GREEN}✓ Docker image built${NC}"

# Step 3: Push to ECR
echo -e "${BLUE}Step 3: Pushing to ECR...${NC}"

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Tag and push
docker tag pathfind:latest ${ECR_URL}:latest
docker push ${ECR_URL}:latest
echo -e "${GREEN}✓ Image pushed to ECR${NC}"

# Step 4: Update ECS service
echo -e "${BLUE}Step 4: Deploying to ECS...${NC}"
aws ecs update-service \
    --cluster pathfind-sandbox-cluster \
    --service pathfind-sandbox-service \
    --force-new-deployment \
    --region ${AWS_REGION} \
    --output text > /dev/null

echo -e "${YELLOW}Waiting for deployment to complete (this takes ~2-3 minutes)...${NC}"

# Wait for service to stabilize
aws ecs wait services-stable \
    --cluster pathfind-sandbox-cluster \
    --services pathfind-sandbox-service \
    --region ${AWS_REGION} 2>/dev/null || true

# Get the ALB URL
ALB_URL=$(aws elbv2 describe-load-balancers \
    --names pathfind-sandbox-alb \
    --query 'LoadBalancers[0].DNSName' \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "")

# Success message
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}   🎉 Deployment Complete! 🎉        ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e ""
echo -e "${GREEN}Application URL:${NC} http://${ALB_URL}"
echo -e ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "• View logs: ${BLUE}aws logs tail /ecs/pathfind-sandbox --follow${NC}"
echo -e "• Check status: ${BLUE}aws ecs describe-services --cluster pathfind-sandbox-cluster --services pathfind-sandbox-service${NC}"
echo -e "• Cleanup: ${BLUE}./scripts/sandbox-cleanup.sh${NC}"
echo -e ""
echo -e "${YELLOW}⏱️  Note: The app may take 1-2 minutes to be fully accessible${NC}"
echo -e ""
echo -e "${MAGENTA}Sandbox expires in 4 hours (typical). Run cleanup before expiry!${NC}"