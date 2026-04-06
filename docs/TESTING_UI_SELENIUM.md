# Selenium UI Functional Testing

## Scope
UI functional tests are implemented with Selenium in `tests/ui/`.

Covered flows:
- Home navigation to module routes.
- Kundli form submission and result rendering.
- Vaastu report form submission and result rendering.
- Consult session creation flow.
- Business wallet top-up flow.
- End-to-end business flow: subscription activate/revoke, add-on activate/revoke, bundle, offer claim, reviews moderation, disputes resolve, refund request/resolve, billing/subscription audit views.
- Matchmaking compatibility submission flow.
- Panchang + muhurta submission flow.

## Files
- `tests/ui/conftest.py`
- `tests/ui/test_web_flows_selenium.py`
- `scripts/test-ui.sh`

## Prerequisites
1. Backend running on `http://localhost:8101`.
2. Web app running on `http://localhost:3000` (or set `UI_BASE_URL`).
3. Chrome WebDriver available locally, or remote Selenium Grid URL.

## Run
```bash
bash scripts/cortexctl.sh ui-test
```

Equivalent direct run:
```bash
bash scripts/test-ui.sh
```

## Environment Variables
- `RUN_UI_TESTS=1`: required to execute UI tests (defaults to `1` in `scripts/test-ui.sh`).
- `UI_BASE_URL=http://localhost:3000`: target web app URL.
- `SELENIUM_REMOTE_URL=http://localhost:4444/wd/hub`: optional remote Selenium server.
- `SELENIUM_BROWSER=chrome`: currently supported browser value.

## Notes
- UI tests are marked with `@pytest.mark.ui` and are opt-in via `RUN_UI_TESTS=1`.
- If WebDriver is unavailable, tests are skipped with explicit reason.
