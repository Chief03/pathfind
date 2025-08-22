output "app_url" {
  description = "URL to access the application"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_repository_url" {
  description = "ECR repository URL for docker push"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_login_command" {
  description = "Command to login to ECR"
  value       = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.app.repository_url}"
}

output "docker_push_commands" {
  description = "Commands to build and push Docker image"
  value       = <<EOF
docker build -t pathfind:latest .
docker tag pathfind:latest ${aws_ecr_repository.app.repository_url}:latest
docker push ${aws_ecr_repository.app.repository_url}:latest
EOF
}

output "update_service_command" {
  description = "Command to force new deployment"
  value       = "aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${aws_ecs_service.main.name} --force-new-deployment --region ${var.aws_region}"
}

output "view_logs_command" {
  description = "Command to view application logs"
  value       = "aws logs tail ${aws_cloudwatch_log_group.ecs_logs.name} --follow --region ${var.aws_region}"
}

output "cleanup_command" {
  description = "Command to destroy all resources"
  value       = "terraform destroy -auto-approve"
}