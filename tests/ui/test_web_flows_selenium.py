from __future__ import annotations

import os
import time

import pytest

pytestmark = [
    pytest.mark.ui,
    pytest.mark.skipif(os.getenv("RUN_UI_TESTS") != "1", reason="Set RUN_UI_TESTS=1 to run Selenium UI tests."),
]


def test_home_navigation(driver, wait, base_url: str) -> None:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC

    driver.get(base_url)
    wait.until(EC.visibility_of_element_located((By.TAG_NAME, "h1")))

    assert "BabaJi" in driver.page_source

    link = driver.find_element(By.LINK_TEXT, "Kundli")
    link.click()
    wait.until(EC.url_contains("/kundli"))


def test_kundli_form_submit(driver, wait, base_url: str) -> None:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC

    driver.get(f"{base_url}/kundli")

    question = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "textarea")))
    question.clear()
    question.send_keys("What should I prioritize this month?")

    submit = driver.find_element(By.CSS_SELECTOR, "button[data-testid='kundli-submit']")
    submit.click()

    result = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='kundli-report-result']")))
    assert "Mode:" in result.text


def test_vaastu_form_submit(driver, wait, base_url: str) -> None:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC

    driver.get(f"{base_url}/vaastu")

    notes = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "textarea")))
    notes.clear()
    notes.send_keys("Need suggestions for layout optimization without demolition.")

    submit = driver.find_element(By.CSS_SELECTOR, "button[data-testid='vaastu-submit']")
    submit.click()

    result = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='vaastu-report-result']")))
    assert "Vaastu Report" in result.text


def test_consult_session_creation(driver, wait, base_url: str) -> None:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC

    driver.get(f"{base_url}/consult")

    submit = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='consult-submit']")))
    submit.click()

    result = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='consult-result']")))
    assert "Session ID:" in result.text


def test_business_wallet_topup(driver, wait, base_url: str) -> None:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC

    driver.get(f"{base_url}/business")

    topup_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-wallet-topup']")))
    topup_button.click()

    result = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='business-wallet-result']")))
    assert "Wallet balance:" in result.text


def test_business_end_to_end_flows(driver, wait, base_url: str) -> None:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC

    driver.get(f"{base_url}/business")

    # Use a unique user for deterministic one-time offer and isolated ledger/review/dispute state.
    user_input = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[data-testid='business-user-id']")))
    user_input.clear()
    user_input.send_keys(f"ui-biz-{int(time.time())}")

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-load-catalog']"))).click()
    catalog = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='business-catalog-result']")))
    assert "Plans:" in catalog.text

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-change-plan']"))).click()
    entitlements = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='business-entitlements-result']")))
    assert "Subscription updated:" in entitlements.text

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-activate-addon']"))).click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "pre[data-testid='business-entitlements-result']"), "Addon"))

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-revoke-addon']"))).click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "pre[data-testid='business-entitlements-result']"), "inactive"))

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-activate-addon']"))).click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "pre[data-testid='business-entitlements-result']"), "Addon"))

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-purchase-bundle']"))).click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "pre[data-testid='business-wallet-result']"), "Bundle"))

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-claim-offer']"))).click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "pre[data-testid='business-wallet-result']"), "Offer claim status: claimed"))

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-submit-review']"))).click()
    reviews = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='business-reviews-result']")))
    assert "Created Review:" in reviews.text

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-moderate-review']"))).click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "pre[data-testid='business-reviews-result']"), "moderation ->"))

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-open-dispute']"))).click()
    disputes = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='business-disputes-result']")))
    assert "Dispute created:" in disputes.text

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-resolve-dispute']"))).click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "pre[data-testid='business-disputes-result']"), "-> resolved"))

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-open-refund']"))).click()
    refunds = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='business-refunds-result']")))
    assert "Refund created:" in refunds.text

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-resolve-refund']"))).click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "pre[data-testid='business-refunds-result']"), "-> approved"))

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-load-billing-events']"))).click()
    audit = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='business-audit-result']")))
    assert "Billing events:" in audit.text

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-load-subscription-events']"))).click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "pre[data-testid='business-audit-result']"), "Subscription events:"))

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='business-revoke-plan']"))).click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "pre[data-testid='business-entitlements-result']"), "Status: inactive"))


def test_matchmaking_form_submit(driver, wait, base_url: str) -> None:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC

    driver.get(f"{base_url}/matchmaking")

    submit = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='matchmaking-submit']")))
    submit.click()

    result = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='matchmaking-result']")))
    assert "Compatibility Score:" in result.text


def test_panchang_and_muhurta_submit(driver, wait, base_url: str) -> None:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC

    driver.get(f"{base_url}/panchang")

    panchang_submit = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='panchang-submit']")))
    panchang_submit.click()

    panchang_result = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='panchang-result']")))
    assert "Tithi:" in panchang_result.text

    muhurta_submit = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='muhurta-submit']")))
    muhurta_submit.click()

    muhurta_result = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "pre[data-testid='muhurta-result']")))
    assert "Intent:" in muhurta_result.text
