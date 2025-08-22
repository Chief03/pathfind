# Simplified Terraform configuration for AWS Sandbox testing
# This uses minimal resources to reduce costs and complexity

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  # Common sandbox account tags
  default_tags {
    tags = {
      Environment = "sandbox"
      Project     = "pathfind"
      ManagedBy   = "terraform"
      Purpose     = "testing"
    }
  }
}

# Use default VPC to save costs (no NAT Gateway needed)
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group for ALB
resource "aws_security_group" "alb" {
  name        = "${var.app_name}-sandbox-alb-sg"
  description = "Security group for ALB in sandbox"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from anywhere"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.app_name}-sandbox-ecs-sg"
  description = "Security group for ECS tasks in sandbox"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "App port from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.app_name}-sandbox-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = data.aws_subnets.default.ids

  enable_deletion_protection = false
  enable_http2              = true
  
  # Sandbox-specific: faster deregistration for testing
  lifecycle {
    create_before_destroy = true
  }
}

# ALB Target Group with sticky sessions for WebSocket
resource "aws_lb_target_group" "app" {
  name        = "${var.app_name}-sandbox-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"

  health_check {
    enabled             = true
    interval            = 30
    path                = "/"
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }

  # Important for WebSocket/Socket.io support
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  deregistration_delay = 30  # Faster for sandbox testing
}

# ALB Listener
resource "aws_lb_listener" "front_end" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ECR Repository
resource "aws_ecr_repository" "app" {
  name                 = "${var.app_name}-sandbox"
  image_tag_mutability = "MUTABLE"
  force_delete         = true  # Allow deletion even with images
}

# ECR Lifecycle Policy for auto-cleanup
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 3 images"
      selection = {
        tagStatus     = "any"
        countType     = "imageCountMoreThan"
        countNumber   = 3
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-sandbox-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"  # Save costs in sandbox
  }

  # Auto-cleanup configuration
  configuration {
    execute_command_configuration {
      logging = "NONE"  # Disable execute command logging for sandbox
    }
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/${var.app_name}-sandbox"
  retention_in_days = 1  # Minimal retention for sandbox

  # Auto-cleanup
  lifecycle {
    create_before_destroy = false
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.app_name}-sandbox-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.app_name}-sandbox"
  network_mode            = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                     = "256"   # Minimum for cost savings
  memory                  = "512"   # Minimum for cost savings
  execution_role_arn      = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = var.app_name
      image = "${aws_ecr_repository.app.repository_url}:latest"
      
      environment = [
        {
          name  = "NODE_ENV"
          value = "sandbox"
        },
        {
          name  = "PORT"
          value = tostring(var.app_port)
        },
        {
          name  = "JWT_SECRET"
          value = var.jwt_secret
        }
      ]
      
      portMappings = [
        {
          containerPort = var.app_port
          protocol      = "tcp"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      # Sandbox: minimal resource allocation
      cpu    = 256
      memory = 512
    }
  ])
}

# ECS Service with minimal configuration
resource "aws_ecs_service" "main" {
  name            = "${var.app_name}-sandbox-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1  # Single instance for sandbox
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets         = data.aws_subnets.default.ids
    assign_public_ip = true  # Required for Fargate in public subnet
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.app_name
    container_port   = var.app_port
  }

  # Faster deployments for testing
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  depends_on = [aws_lb_listener.front_end]
  
  lifecycle {
    ignore_changes = [task_definition]  # Allow manual updates for testing
  }
}