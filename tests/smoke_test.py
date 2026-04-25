"""
T16 Smoke Tests — static UI layers that work without real Supabase
Requires dev server on port 3000 (started by with_server.py)
"""
import sys
import time
from playwright.sync_api import sync_playwright, expect

import os
BASE = os.environ.get('BASE_URL', 'http://localhost:3000')
PASS = 0
FAIL = 0


def check(name, fn):
    global PASS, FAIL
    try:
        fn()
        print(f'  \u2713 {name}')
        PASS += 1
    except Exception as e:
        print(f'  \u2717 {name}: {e}')
        FAIL += 1


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.set_default_timeout(90_000)
    page.set_default_navigation_timeout(90_000)

    # Collect console errors
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

    # ── Home page ─────────────────────────────────────────────────────────────
    print('\n[Smoke A] \ud648 \ud398\uc774\uc9c0 \ub80c\ub354\ub9c1')
    page.goto(BASE)
    page.wait_for_load_state('networkidle')

    check('\ud0c0\uc774\ud2c0 \ub80c\ub354\ub9c1', lambda: expect(page.locator('h1')).to_contain_text('\ubbfc\uc8fc\uacf5\ud654\uad6d'))
    check('\ud559\uc0dd \ub9c1\ud06c \uc874\uc7ac', lambda: expect(page.get_by_text('\ud559\uc0dd \ud654\uba74')).to_be_visible())
    check('\uad50\uc0ac \ub9c1\ud06c \uc874\uc7ac', lambda: expect(page.get_by_text('\uad50\uc0ac \ucf58\uc194')).to_be_visible())

    # ── Student landing ───────────────────────────────────────────────────────
    print('\n[Smoke B] \ud559\uc0dd \ub79c\ub529 \ud398\uc774\uc9c0 + \ucf54\ub4dc \uc720\ud6a8\uc131')
    page.goto(f'{BASE}/student')
    page.wait_for_load_state('networkidle')

    check('\ub85c\uace0 \ud45c\uc2dc', lambda: expect(page.locator('h1')).to_contain_text('\ubbfc\uc8fc\uacf5\ud654\uad6d'))
    check('\ucf54\ub4dc \uc785\ub825 \ud544\ub4dc', lambda: expect(page.get_by_placeholder('ABC-123')).to_be_visible())

    # Invalid code validation
    page.get_by_placeholder('ABC-123').fill('ABC')
    page.get_by_text('\uc785\uc7a5\ud558\uae30').click()
    check('\uc798\ubabb\ub41c \ucf54\ub4dc \uc5d0\ub7ec \ud45c\uc2dc', lambda: expect(page.get_by_text('\uc720\ud6a8\ud55c \ucf54\ub4dc \ud615\uc2dd')).to_be_visible())

    # Short input doesn't navigate
    current_url = page.url
    check('\uc8fc\uc18c \ubcc0\uacbd \uc5c6\uc74c', lambda: None if page.url == current_url else (_ for _ in ()).throw(AssertionError(f'navigated to {page.url}')))

    # Valid code format → navigates
    page.get_by_placeholder('ABC-123').fill('ABC-123')
    with page.expect_navigation(wait_until='commit'):
        page.get_by_text('\uc785\uc7a5\ud558\uae30').click()
    check('\uc720\ud6a8\ud55c \ucf54\ub4dc \ub124\ube44\uac8c\uc774\uc158', lambda: None if '/student/ABC-123' in page.url else (_ for _ in ()).throw(AssertionError(f'url: {page.url}')))

    # ── Teacher setup page ────────────────────────────────────────────────────
    print('\n[Smoke C] \uad50\uc0ac \uc138\uc158 \uc124\uc815 \ud398\uc774\uc9c0')
    page.goto(f'{BASE}/teacher')
    page.wait_for_load_state('networkidle')

    check('\ud398\uc774\uc9c0 \ub80c\ub354\ub9c1 (crash \uc5c6\uc74c)', lambda: expect(page.locator('body')).to_be_visible())
    # Player count slider should be present
    slider = page.locator('input[type="range"]')
    check('\uc2ac\ub77c\uc774\ub354 \ub80c\ub354\ub9c1', lambda: expect(slider).to_be_visible())

    # Slider range validation
    check('\uc2ac\ub77c\uc774\ub354 min=10', lambda: None if slider.get_attribute('min') == '10' else (_ for _ in ()).throw(AssertionError(f'min={slider.get_attribute("min")}')))
    check('\uc2ac\ub77c\uc774\ub354 max=30', lambda: None if slider.get_attribute('max') == '30' else (_ for _ in ()).throw(AssertionError(f'max={slider.get_attribute("max")}')))

    # ── No fatal console errors on static pages ───────────────────────────────
    print('\n[Smoke D] \ucf58\uc194 \uc624\ub958 \uc5c6\uc74c')
    # Filter out Next.js dev-mode RSC payload fetch errors (non-standard port, not an app bug)
    fatal_errors = [
        e for e in console_errors
        if ('TypeError' in e or 'ReferenceError' in e)
        and 'RSC payload' not in e
        and 'fetchServerResponse' not in e
    ]
    check('\uce58\uba85\uc801 JS \uc624\ub958 \uc5c6\uc74c', lambda: None if not fatal_errors else (_ for _ in ()).throw(AssertionError('\n  '.join(fatal_errors[:3]))))

    browser.close()

print(f'\n{"=" * 50}')
print(f'SMOKE PASS: {PASS}  FAIL: {FAIL}  TOTAL: {PASS+FAIL}')
sys.exit(1 if FAIL > 0 else 0)
