variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "pathfind"
}

variable "app_port" {
  description = "Port exposed by the Docker container"
  type        = number
  default     = 3001
}

variable "app_count" {
  description = "Number of Docker containers to run"
  type        = number
  default     = 2
}

variable "fargate_cpu" {
  description = "Fargate instance CPU units (256, 512, 1024, 2048, 4096)"
  type        = string
  default     = "256"
}

variable "fargate_memory" {
  description = "Fargate instance memory in MiB (512, 1024, 2048, 4096, 8192, 16384, 32768)"
  type        = string
  default     = "512"
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}