variable "project_name" {
  description = "Prefix for AWS resources"
  type        = string
  default     = "cerebral-cortex"
}

variable "region" {
  description = "AWS region for EC2 workload"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance size. Keep micro to stay free-tier eligible for new accounts."
  type        = string
  default     = "t3.micro"
}

variable "root_volume_size_gb" {
  description = "Root volume size in GB"
  type        = number
  default     = 20
}

variable "http_ingress_cidr" {
  description = "CIDR allowed to access HTTP port 80"
  type        = string
  default     = "0.0.0.0/0"
}

variable "enable_ssh" {
  description = "Enable inbound SSH on port 22"
  type        = bool
  default     = true
}

variable "ssh_ingress_cidr" {
  description = "CIDR allowed for SSH"
  type        = string
  default     = "0.0.0.0/0"
}

variable "existing_key_name" {
  description = "Use an existing EC2 key pair name. Leave empty to use ssh_public_key value."
  type        = string
  default     = ""
}

variable "ssh_public_key" {
  description = "Public key value to create a new key pair if existing_key_name is empty"
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email for budget and emergency alerts (subscription confirmation required)"
  type        = string
  default     = ""
}

variable "monthly_budget_usd" {
  description = "Monthly AWS budget cap in USD"
  type        = number
  default     = 8
}

variable "budget_actual_alert_percent" {
  description = "Alert when actual spend crosses this percent of budget"
  type        = number
  default     = 70
}

variable "budget_forecast_alert_percent" {
  description = "Alert when forecasted spend crosses this percent of budget"
  type        = number
  default     = 90
}

variable "emergency_stop_threshold_usd" {
  description = "Emergency stop threshold based on EstimatedCharges metric"
  type        = number
  default     = 10
}

variable "start_schedule_utc" {
  description = "UTC schedule expression to auto-start instance"
  type        = string
  default     = "cron(0 13 * * ? *)"
}

variable "stop_schedule_utc" {
  description = "UTC schedule expression to auto-stop instance"
  type        = string
  default     = "cron(0 4 * * ? *)"
}
