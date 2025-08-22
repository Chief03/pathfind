#!/bin/bash

# Pathfind AWS Deployment Script
# This script builds and deploys the Pathfind application to AWS ECS

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
APP_NAME=${APP_NAME:-"pathfind"}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}"

echo -e "${GREEN}🚀 Starting Pathfind deployment to AWS${NC}"
echo -e "Region: ${AWS_REGION}"
echo -e "Account: ${AWS_ACCOUNT_ID}"
echo -e "Repository: ${ECR_REPOSITORY}"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    # Check if Terraform is installed (for infrastructure)
    if ! command -v terraform &> /dev/null; then
        echo -e "${YELLOW}Terraform is not installed. Infrastructure must be deployed separately.${NC}"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}AWS credentials not configured. Please configure AWS CLI.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Prerequisites check passed${NC}"
}

# Build Docker image
build_image() {
    echo -e "${YELLOW}Building Docker image...${NC}"
    docker build -t ${APP_NAME}:latest .
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
}

# Tag and push to ECR
push_to_ecr() {
    echo -e "${YELLOW}Pushing image to ECR...${NC}"
    
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    
    # Check if repository exists, create if not
    if ! aws ecr describe-repositories --repository-names ${APP_NAME} --region ${AWS_REGION} 2>/dev/null; then
        echo -e "${YELLOW}Creating ECR repository...${NC}"
        aws ecr create-repository --repository-name ${APP_NAME} --region ${AWS_REGION}
    fi
    
    # Tag image
    docker tag ${APP_NAME}:latest ${ECR_REPOSITORY}:latest
    docker tag ${APP_NAME}:latest ${ECR_REPOSITORY}:$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
    
    # Push image
    docker push ${ECR_REPOSITORY}:latest
    docker push ${ECR_REPOSITORY}:$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
    
    echo -e "${GREEN}✓ Image pushed to ECR successfully${NC}"
}

# Update ECS service
update_ecs_service() {
    echo -e "${YELLOW}Updating ECS service...${NC}"
    
    CLUSTER_NAME="${APP_NAME}-cluster"
    SERVICE_NAME="${APP_NAME}-service"
    
    # Force new deployment
    aws ecs update-service \
        --cluster ${CLUSTER_NAME} \
        --service ${SERVICE_NAME} \
        --force-new-deployment \
        --region ${AWS_REGION}
    
    echo -e "${GREEN}✓ ECS service update initiated${NC}"
    echo -e "${YELLOW}Waiting for service to stabilize...${NC}"
    
    # Wait for service to stabilize
    aws ecs wait services-stable \
        --cluster ${CLUSTER_NAME} \
        --services ${SERVICE_NAME} \
        --region ${AWS_REGION}
    
    echo -e "${GREEN}✓ ECS service updated successfully${NC}"
}

# Get application URL
get_app_url() {
    echo -e "${YELLOW}Getting application URL...${NC}"
    
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --names "${APP_NAME}-alb" \
        --query 'LoadBalancers[0].DNSName' \
        --output text \
        --region ${AWS_REGION} 2>/dev/null || echo "")
    
    if [ -n "$ALB_DNS" ]; then
        echo -e "${GREEN}✅ Deployment complete!${NC}"
        echo -e "${GREEN}Application URL: http://${ALB_DNS}${NC}"
    else
        echo -e "${YELLOW}Could not retrieve load balancer DNS. Check AWS Console.${NC}"
    fi
}

# Main deployment flow
main() {
    check_prerequisites
    build_image
    push_to_ecr
    update_ecs_service
    get_app_url
}

# Run main function
main