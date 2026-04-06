terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.85"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.6"
    }
  }
}

provider "aws" {
  region = var.region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}

# Use default VPC/subnet to avoid NAT Gateway and extra network charges.
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "app" {
  name        = "${var.project_name}-sg"
  description = "Security group for ${var.project_name}"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.http_ingress_cidr]
  }

  dynamic "ingress" {
    for_each = var.enable_ssh ? [1] : []
    content {
      description = "SSH"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [var.ssh_ingress_cidr]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg"
  }
}

resource "aws_iam_role" "ec2_ssm_role" {
  name = "${var.project_name}-ec2-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm_core" {
  role       = aws_iam_role.ec2_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2_ssm_role.name
}

resource "aws_key_pair" "generated" {
  count      = var.ssh_public_key == "" ? 0 : 1
  key_name   = "${var.project_name}-key"
  public_key = var.ssh_public_key
}

locals {
  key_name = var.existing_key_name != "" ? var.existing_key_name : (var.ssh_public_key != "" ? aws_key_pair.generated[0].key_name : null)
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name
  key_name               = local.key_name

  monitoring            = true
  disable_api_termination = false

  user_data = templatefile("${path.module}/templates/user_data.sh.tftpl", {
    project_name = var.project_name
  })

  root_block_device {
    volume_size           = var.root_volume_size_gb
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_tokens = "required"
  }

  tags = {
    Name    = "${var.project_name}-ec2"
    Project = var.project_name
    CostCap = tostring(var.monthly_budget_usd)
  }
}

resource "aws_eip" "app" {
  domain   = "vpc"
  instance = aws_instance.app.id

  tags = {
    Name = "${var.project_name}-eip"
  }
}

# Cost-control notification topics in us-east-1 (billing metrics are published there).
resource "aws_sns_topic" "budget_alerts" {
  provider = aws.us_east_1
  name     = "${var.project_name}-budget-alerts"
}

resource "aws_sns_topic" "emergency_stop" {
  provider = aws.us_east_1
  name     = "${var.project_name}-emergency-stop"
}

resource "aws_sns_topic_subscription" "budget_email" {
  provider  = aws.us_east_1
  count     = var.alert_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_subscription" "emergency_email" {
  provider  = aws.us_east_1
  count     = var.alert_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.emergency_stop.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_budgets_budget" "monthly" {
  provider = aws.us_east_1

  name         = "${var.project_name}-monthly-budget"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.budget_actual_alert_percent
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_alerts.arn]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.budget_forecast_alert_percent
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_sns_topic_arns  = [aws_sns_topic.budget_alerts.arn]
  }
}

data "archive_file" "instance_control_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/instance_control.py"
  output_path = "${path.module}/lambda/instance_control.zip"
}

resource "aws_iam_role" "lambda_role" {
  provider = aws.us_east_1
  name     = "${var.project_name}-instance-control-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  provider = aws.us_east_1
  name     = "${var.project_name}-instance-control-policy"
  role     = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:StartInstances",
          "ec2:StopInstances"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "instance_control" {
  provider         = aws.us_east_1
  function_name    = "${var.project_name}-instance-control"
  role             = aws_iam_role.lambda_role.arn
  handler          = "instance_control.lambda_handler"
  runtime          = "python3.12"
  filename         = data.archive_file.instance_control_zip.output_path
  source_code_hash = data.archive_file.instance_control_zip.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      TARGET_INSTANCE_ID     = aws_instance.app.id
      TARGET_INSTANCE_REGION = var.region
    }
  }
}

resource "aws_sns_topic_subscription" "emergency_lambda" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.emergency_stop.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.instance_control.arn
}

resource "aws_lambda_permission" "allow_sns" {
  provider      = aws.us_east_1
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.instance_control.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.emergency_stop.arn
}

resource "aws_cloudwatch_metric_alarm" "billing_emergency" {
  provider            = aws.us_east_1
  alarm_name          = "${var.project_name}-estimated-charge-emergency"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = var.emergency_stop_threshold_usd
  alarm_description   = "Emergency stop guardrail when estimated charges cross threshold."
  treat_missing_data  = "notBreaching"
  dimensions = {
    Currency = "USD"
  }

  alarm_actions = [
    aws_sns_topic.emergency_stop.arn,
    aws_sns_topic.budget_alerts.arn,
  ]
}

resource "aws_cloudwatch_event_rule" "scheduled_stop" {
  provider            = aws.us_east_1
  name                = "${var.project_name}-scheduled-stop"
  description         = "Scheduled stop to control free-tier usage."
  schedule_expression = var.stop_schedule_utc
}

resource "aws_cloudwatch_event_target" "scheduled_stop_lambda" {
  provider  = aws.us_east_1
  rule      = aws_cloudwatch_event_rule.scheduled_stop.name
  target_id = "StopInstance"
  arn       = aws_lambda_function.instance_control.arn
  input     = jsonencode({ action = "stop" })
}

resource "aws_cloudwatch_event_rule" "scheduled_start" {
  provider            = aws.us_east_1
  name                = "${var.project_name}-scheduled-start"
  description         = "Scheduled start for daily availability window."
  schedule_expression = var.start_schedule_utc
}

resource "aws_cloudwatch_event_target" "scheduled_start_lambda" {
  provider  = aws.us_east_1
  rule      = aws_cloudwatch_event_rule.scheduled_start.name
  target_id = "StartInstance"
  arn       = aws_lambda_function.instance_control.arn
  input     = jsonencode({ action = "start" })
}

resource "aws_lambda_permission" "allow_eventbridge_stop" {
  provider      = aws.us_east_1
  statement_id  = "AllowExecutionFromEventBridgeStop"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.instance_control.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scheduled_stop.arn
}

resource "aws_lambda_permission" "allow_eventbridge_start" {
  provider      = aws.us_east_1
  statement_id  = "AllowExecutionFromEventBridgeStart"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.instance_control.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scheduled_start.arn
}
