from __future__ import annotations

import json
import os
from typing import Any

import boto3


def _target() -> tuple[str, str]:
    instance_id = os.environ["TARGET_INSTANCE_ID"]
    region = os.environ["TARGET_INSTANCE_REGION"]
    return instance_id, region


def _action_from_event(event: dict[str, Any]) -> str:
    if "Records" in event:
        # SNS triggered emergency event -> stop immediately.
        return "stop"
    action = str(event.get("action", "stop")).lower()
    return "start" if action == "start" else "stop"


def lambda_handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    instance_id, region = _target()
    action = _action_from_event(event)

    ec2 = boto3.client("ec2", region_name=region)

    if action == "start":
        ec2.start_instances(InstanceIds=[instance_id])
    else:
        ec2.stop_instances(InstanceIds=[instance_id])

    return {
        "instance_id": instance_id,
        "region": region,
        "action": action,
        "event": json.dumps(event)[:500],
    }
