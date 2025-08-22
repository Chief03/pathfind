#!/bin/bash

# Infrastructure Setup Script for Pathfind
# This script sets up the AWS infrastructure using Terraform

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}   Pathfind Infrastructure Setup     ${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Terraform is not installed.${NC}"
    echo -e "${YELLOW}Please install Terraform from: https://www.terraform.io/downloads${NC}"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS CLI is not configured.${NC}"
    echo -e "${YELLOW}Please run: aws configure${NC}"
    exit 1
fi

cd terraform

# Initialize Terraform
echo -e "${YELLOW}Initializing Terraform...${NC}"

# Create S3 bucket for Terraform state if it doesn't exist
STATE_BUCKET="pathfind-terraform-state"
AWS_REGION=${AWS_REGION:-"us-east-1"}

if ! aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
    echo -e "${YELLOW}Creating S3 bucket for Terraform state...${NC}"
    aws s3api create-bucket \
        --bucket "$STATE_BUCKET" \
        --region "$AWS_REGION" \
        $(if [ "$AWS_REGION" != "us-east-1" ]; then echo "--create-bucket-configuration LocationConstraint=$AWS_REGION"; fi)
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$STATE_BUCKET" \
        --versioning-configuration Status=Enabled
    
    echo -e "${GREEN}✓ S3 bucket created${NC}"
fi

terraform init

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}terraform.tfvars not found. Creating from template...${NC}"
    cp terraform.tfvars.example terraform.tfvars
    echo -e "${RED}Please edit terraform/terraform.tfvars with your configuration!${NC}"
    echo -e "${YELLOW}Especially set a secure JWT_SECRET value.${NC}"
    exit 1
fi

# Plan the infrastructure
echo -e "${YELLOW}Planning infrastructure...${NC}"
terraform plan -out=tfplan

# Ask for confirmation
echo -e "${YELLOW}Do you want to apply these changes? (yes/no)${NC}"
read -r response
if [[ "$response" != "yes" ]]; then
    echo -e "${RED}Aborting infrastructure setup.${NC}"
    exit 0
fi

# Apply the infrastructure
echo -e "${YELLOW}Creating infrastructure...${NC}"
terraform apply tfplan

# Output important values
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}   Infrastructure Setup Complete!    ${NC}"
echo -e "${GREEN}=====================================${NC}"

terraform output

echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Note the ECR repository URL above"
echo -e "2. Run ${GREEN}./scripts/deploy.sh${NC} to deploy the application"
echo -e "3. Access your app at the ALB hostname shown above"