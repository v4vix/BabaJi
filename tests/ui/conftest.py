from __future__ import annotations

import os
import urllib.error
import urllib.request

import pytest


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.getenv("UI_BASE_URL", "http://localhost:3000")


def _check_reachable(url: str) -> None:
    try:
        with urllib.request.urlopen(url, timeout=4) as response:
            if response.status >= 400:
                raise RuntimeError(f"UI not reachable: {url} ({response.status})")
    except (urllib.error.URLError, RuntimeError) as exc:
        pytest.skip(f"UI functional tests skipped; target not reachable at {url}: {exc}")


@pytest.fixture
def driver(base_url: str):
    selenium = pytest.importorskip("selenium")
    from selenium.common.exceptions import WebDriverException
    from selenium.webdriver import Chrome
    from selenium.webdriver import Remote
    from selenium.webdriver.chrome.options import Options

    _check_reachable(base_url)

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1440,1000")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    remote_url = os.getenv("SELENIUM_REMOTE_URL")
    browser = os.getenv("SELENIUM_BROWSER", "chrome").lower()

    try:
        if remote_url:
            if browser != "chrome":
                pytest.skip("Only chrome is configured in this Selenium test harness.")
            driver_instance = Remote(command_executor=remote_url, options=options)
        else:
            driver_instance = Chrome(options=options)
    except WebDriverException as exc:
        pytest.skip(f"WebDriver unavailable: {exc}")

    driver_instance.implicitly_wait(1)
    yield driver_instance
    driver_instance.quit()


@pytest.fixture
def wait(driver):
    from selenium.webdriver.support.ui import WebDriverWait

    return WebDriverWait(driver, timeout=12)
