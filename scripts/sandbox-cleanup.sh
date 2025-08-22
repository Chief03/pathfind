#!/bin/bash

# Sandbox Cleanup Script
# Removes all AWS resources created for the sandbox deployment

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}=====================================${NC}"
echo -e "${MAGENTA}   Pathfind Sandbox Cleanup 🧹       ${NC}"
echo -e "${MAGENTA}=====================================${NC}"

AWS_REGION=${AWS_REGION:-"us-east-1"}

# Warning message
echo -e "${RED}⚠️  WARNING: This will delete ALL sandbox resources!${NC}"
echo -e "Resources to be deleted:"
echo -e "• ECS Cluster, Service, and Tasks"
echo -e "• ECR Repository and all images"
echo -e "• Application Load Balancer"
echo -e "• Security Groups"
echo -e "• CloudWatch Logs"
echo -e "• IAM Roles and Policies"
echo -e ""
echo -e "${YELLOW}Are you sure you want to continue? (yes/no)${NC}"
read -r response
if [[ "$response" != "yes" ]]; then
    echo -e "${GREEN}Cleanup cancelled.${NC}"
    exit 0
fi

# Function to safely delete resources
safe_delete() {
    local command=$1
    local description=$2
    echo -e "${YELLOW}${description}...${NC}"
    if eval "$command" 2>/dev/null; then
        echo -e "${GREEN}✓ ${description} complete${NC}"
    else
        echo -e "${YELLOW}⚠ ${description} skipped (may not exist)${NC}"
    fi
}

# Method 1: Terraform Destroy (Recommended)
if [ -d "terraform/sandbox" ] && command -v terraform &> /dev/null; then
    echo -e "${BLUE}Using Terraform to destroy infrastructure...${NC}"
    cd terraform/sandbox
    
    if [ -f "terraform.tfstate" ]; then
        terraform destroy -auto-approve -var="aws_region=${AWS_REGION}"
        echo -e "${GREEN}✅ All resources cleaned up via Terraform${NC}"
        cd ../..
        exit 0
    else
        echo -e "${YELLOW}No Terraform state found, using manual cleanup...${NC}"
        cd ../..
    fi
fi

# Method 2: Manual Cleanup (Fallback)
echo -e "${BLUE}Starting manual cleanup...${NC}"

# Stop ECS Service
safe_delete \
    "aws ecs update-service --cluster pathfind-sandbox-cluster --service pathfind-sandbox-service --desired-count 0 --region ${AWS_REGION} --no-cli-pager" \
    "Stopping ECS service"

# Delete ECS Service
safe_delete \
    "aws ecs delete-service --cluster pathfind-sandbox-cluster --service pathfind-sandbox-service --force --region ${AWS_REGION} --no-cli-pager" \
    "Deleting ECS service"

# Wait for service deletion
echo -e "${YELLOW}Waiting for service deletion...${NC}"
sleep 10

# Delete ECS Cluster
safe_delete \
    "aws ecs delete-cluster --cluster pathfind-sandbox-cluster --region ${AWS_REGION} --no-cli-pager" \
    "Deleting ECS cluster"

# Delete Task Definition (deregister all revisions)
echo -e "${YELLOW}Deregistering task definitions...${NC}"
TASK_DEFINITIONS=$(aws ecs list-task-definitions --family-prefix pathfind-sandbox --region ${AWS_REGION} --query 'taskDefinitionArns[]' --output text 2>/dev/null || echo "")
for TASK_DEF in $TASK_DEFINITIONS; do
    safe_delete \
        "aws ecs deregister-task-definition --task-definition ${TASK_DEF} --region ${AWS_REGION} --no-cli-pager" \
        "Deregistering ${TASK_DEF}"
done

# Delete ECR Repository
safe_delete \
    "aws ecr delete-repository --repository-name pathfind-sandbox --force --region ${AWS_REGION} --no-cli-pager" \
    "Deleting ECR repository"

# Delete Load Balancer
ALB_ARN=$(aws elbv2 describe-load-balancers --names pathfind-sandbox-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text --region ${AWS_REGION} 2>/dev/null || echo "")
if [ -n "$ALB_ARN" ] && [ "$ALB_ARN" != "None" ]; then
    safe_delete \
        "aws elbv2 delete-load-balancer --load-balancer-arn ${ALB_ARN} --region ${AWS_REGION} --no-cli-pager" \
        "Deleting load balancer"
    
    # Wait for ALB deletion
    echo -e "${YELLOW}Waiting for load balancer deletion (this may take a minute)...${NC}"
    sleep 30
fi

# Delete Target Group
TG_ARN=$(aws elbv2 describe-target-groups --names pathfind-sandbox-tg --query 'TargetGroups[0].TargetGroupArn' --output text --region ${AWS_REGION} 2>/dev/null || echo "")
if [ -n "$TG_ARN" ] && [ "$TG_ARN" != "None" ]; then
    safe_delete \
        "aws elbv2 delete-target-group --target-group-arn ${TG_ARN} --region ${AWS_REGION} --no-cli-pager" \
        "Deleting target group"
fi

# Delete Security Groups
echo -e "${YELLOW}Deleting security groups...${NC}"
for SG_NAME in "pathfind-sandbox-alb-sg" "pathfind-sandbox-ecs-sg"; do
    SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${SG_NAME}" --query 'SecurityGroups[0].GroupId' --output text --region ${AWS_REGION} 2>/dev/null || echo "")
    if [ -n "$SG_ID" ] && [ "$SG_ID" != "None" ]; then
        safe_delete \
            "aws ec2 delete-security-group --group-id ${SG_ID} --region ${AWS_REGION} --no-cli-pager" \
            "Deleting security group ${SG_NAME}"
    fi
done

# Delete CloudWatch Log Group
safe_delete \
    "aws logs delete-log-group --log-group-name /ecs/pathfind-sandbox --region ${AWS_REGION} --no-cli-pager" \
    "Deleting CloudWatch logs"

# Delete IAM Roles
echo -e "${YELLOW}Cleaning up IAM roles...${NC}"
for ROLE_NAME in "pathfind-sandbox-exec-role"; do
    # Detach policies first
    POLICIES=$(aws iam list-attached-role-policies --role-name ${ROLE_NAME} --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null || echo "")
    for POLICY in $POLICIES; do
        safe_delete \
            "aws iam detach-role-policy --role-name ${ROLE_NAME} --policy-arn ${POLICY} --no-cli-pager" \
            "Detaching policy from ${ROLE_NAME}"
    done
    
    # Delete role
    safe_delete \
        "aws iam delete-role --role-name ${ROLE_NAME} --no-cli-pager" \
        "Deleting IAM role ${ROLE_NAME}"
done

# Clean up local files
echo -e "${YELLOW}Cleaning up local files...${NC}"
if [ -d "terraform/sandbox/.terraform" ]; then
    rm -rf terraform/sandbox/.terraform
    rm -f terraform/sandbox/.terraform.lock.hcl
    rm -f terraform/sandbox/terraform.tfstate*
    echo -e "${GREEN}✓ Local Terraform files cleaned${NC}"
fi

if [ -d "tmp/localstack" ]; then
    rm -rf tmp/localstack
    echo -e "${GREEN}✓ LocalStack data cleaned${NC}"
fi

# Final message
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}   ✅ Cleanup Complete!              ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e ""
echo -e "All sandbox resources have been removed."
echo -e "Your AWS account is clean! 🎉"