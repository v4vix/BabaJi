#!/usr/bin/env bash
set -euo pipefail

curl -sS -X POST http://localhost:8101/v1/kundli/report \
  -H 'Content-Type: application/json' \
  -H 'X-Plan: elite' \
  -d '{"profile_id":"demo","birth":{"date":"1993-04-08","time":"07:12","timezone":"Asia/Kolkata","location":"Jaipur","latitude":26.9124,"longitude":75.7873},"question":"How should I plan the next month?"}'

echo

curl -sS -X POST http://localhost:8101/v1/vaastu/report \
  -H 'Content-Type: application/json' \
  -H 'X-Plan: elite' \
  -d '{"profile_id":"demo","layout":{"facing_direction":"East","rooms":{"kitchen":"Southeast","bedroom":"Southwest"},"entrance":"North"}}'

echo

curl -sS -X POST http://localhost:8101/v1/video/vaastu \
  -H 'Content-Type: application/json' \
  -H 'X-Plan: elite' \
  -d '{"profile_id":"demo","topic":"vaastu","payload":{"goal":"walkthrough"}}'
