output "instance_id" {
  value = aws_instance.app.id
}

output "public_ip" {
  value = aws_eip.app.public_ip
}

output "web_url" {
  value = "http://${aws_eip.app.public_ip}"
}

output "ssh_command" {
  value = local.key_name == null ? "SSH disabled or key not configured" : "ssh ec2-user@${aws_eip.app.public_ip}"
}

output "cost_control_summary" {
  value = {
    monthly_budget_usd          = var.monthly_budget_usd
    emergency_stop_threshold_usd = var.emergency_stop_threshold_usd
    start_schedule_utc          = var.start_schedule_utc
    stop_schedule_utc           = var.stop_schedule_utc
  }
}
