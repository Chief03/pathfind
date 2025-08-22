variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
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

variable "jwt_secret" {
  description = "JWT secret for authentication (use any value for sandbox)"
  type        = string
  default     = "sandbox-secret-key-for-testing-only"
}