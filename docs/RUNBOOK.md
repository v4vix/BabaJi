# Runbook

## Start stack
```bash
bash scripts/cortexctl.sh setup
bash scripts/cortexctl.sh warmup --profile optional
bash scripts/cortexctl.sh start --mode apps
```

## Health check
```bash
bash scripts/cortexctl.sh health
```

## Demo flow
```bash
bash scripts/cortexctl.sh demo
```

## UI functional tests (Selenium)
```bash
bash scripts/cortexctl.sh ui-test
```

## AWS strict-cost deploy
```bash
bash scripts/cortexctl.sh aws-tf init
bash scripts/cortexctl.sh aws-tf apply -var-file=infra/aws/terraform.tfvars
bash scripts/cortexctl.sh aws-push --ip <PUBLIC_IP> --key <PRIVATE_KEY_PATH>
```

## Stop stack
```bash
bash scripts/cortexctl.sh stop --mode all
```

## Warm-up only
```bash
bash scripts/run_warmup.sh --model llama3.1:8b --profile optional
```
