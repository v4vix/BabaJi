from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "aws" / "guardrails_check.sh"
EXAMPLE_TFVARS = ROOT / "infra" / "aws" / "terraform.tfvars.example"


def test_guardrail_script_passes_on_repo_example() -> None:
    result = subprocess.run(
        ["bash", str(SCRIPT), "--tfvars", str(EXAMPLE_TFVARS)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + "\n" + result.stderr
    assert "Guardrail summary:" in result.stdout


def test_guardrail_script_fails_on_non_micro_instance(tmp_path: Path) -> None:
    tfvars = tmp_path / "bad.tfvars"
    tfvars.write_text(
        "\n".join(
            [
                'project_name = "bad-check"',
                'instance_type = "c5.large"',
                "root_volume_size_gb = 20",
                "monthly_budget_usd = 8",
                "emergency_stop_threshold_usd = 10",
            ]
        ),
        encoding="utf-8",
    )
    result = subprocess.run(
        ["bash", str(SCRIPT), "--tfvars", str(tfvars)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert "instance_type=c5.large is not micro/free-tier oriented." in result.stdout
