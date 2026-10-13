"""Drive the mock-up's core loop in a real browser (1440x900 and 390x844) and record evidence.

Flow: home -> age gate -> catalog filter -> box page signed out ("Sign in to open") -> sign-in ->
register (validation errors, then details + phone + password) -> email code -> back on the box ->
open (full spin) -> reveal -> sell back -> quick open -> keep -> inventory (ship + cancel when
shippable) -> wallet top-up -> provably fair rotate + verify nonce 0 -> sign out / wrong password /
sign in -> stubs -> 404.

Usage (server from `cd web && npx next build && npx next start -p 3210`):
    python scripts/e2e_flow.py [base_url] [out_dir]
Screenshots and result.json land in out_dir (default: a temp folder, never the repo).
The two expected console 404s come from the deliberate /does-not-exist check.
"""
import json
import re
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3210"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(tempfile.gettempdir()) / "mock-e2e"
OUT.mkdir(parents=True, exist_ok=True)

errors: list[str] = []
log: list[str] = []


def label(page, text: str, exact: bool = False):
    # get_by_label also matches inputs on hidden (Activity-kept) routes, e.g. /sign-in's Email.
    return page.get_by_label(text, exact=exact).filter(visible=True)


def step(msg: str) -> None:
    log.append(msg)
    print("STEP", msg, flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch()
    for vp_name, vp in [("desktop", {"width": 1440, "height": 900}), ("mobile", {"width": 390, "height": 844})]:
        ctx = browser.new_context(viewport=vp)
        page = ctx.new_page()
        page.on("console", lambda m: errors.append(f"[{vp_name}] console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append(f"[{vp_name}] pageerror: {e}"))

        page.goto(BASE + "/")
        step(f"{vp_name}: home loaded")
        dialog = page.get_by_role("dialog")
        expect(dialog).to_be_visible(timeout=10_000)
        page.screenshot(path=str(OUT / f"{vp_name}-01-agegate.png"))
        page.get_by_role("button", name="Yes, I am").click()
        expect(dialog).to_be_hidden()
        page.wait_for_timeout(1800)
        page.screenshot(path=str(OUT / f"{vp_name}-02-home.png"))
        page.screenshot(path=str(OUT / f"{vp_name}-03-home-full.png"), full_page=True)
        expect(page.locator("header a[href='/register']:visible")).to_have_text("Join")
        step(f"{vp_name}: age gate confirmed, header shows Sign in + Join while signed out")

        if vp_name == "mobile":
            page.get_by_role("button", name="Open menu").click()
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT / f"{vp_name}-04-menu.png"))
            page.get_by_role("navigation", name="Mobile").get_by_role("link", name="Boxes").click()
        else:
            page.get_by_role("navigation", name="Primary").get_by_role("link", name="Boxes").click()
        page.wait_for_url("**/boxes")
        page.wait_for_timeout(600)
        page.screenshot(path=str(OUT / f"{vp_name}-05-boxes.png"), full_page=True)
        # :visible — Next 16 keeps the previous route mounted (hidden) after client navigation.
        grid = page.locator("main a[href^='/boxes/']:visible")
        expect(grid).to_have_count(8)
        page.get_by_role("button", name="Watches", exact=True).click()
        expect(grid).to_have_count(1)
        step(f"{vp_name}: catalog filter Watches -> {grid.count()} card(s) of 8")
        page.get_by_role("button", name="All", exact=True).click()

        page.goto(BASE + "/boxes/first-edition")
        gate = page.get_by_role("link", name="Sign in to open")
        expect(gate).to_be_visible(timeout=10_000)
        page.screenshot(path=str(OUT / f"{vp_name}-06a-box-signed-out.png"))
        gate.click()
        page.wait_for_url("**/sign-in?next=%2Fboxes%2Ffirst-edition")
        page.get_by_role("link", name="Create an account").click()
        page.wait_for_url("**/register?next=%2Fboxes%2Ffirst-edition")
        page.get_by_role("button", name="Continue with email").click()
        expect(page.locator("[aria-invalid='true']:visible")).to_have_count(6)
        page.screenshot(path=str(OUT / f"{vp_name}-06b-register-errors.png"), full_page=True)
        email = f"e2e.{vp_name}@example.com"
        label(page, "Email", exact=True).fill(email)
        label(page, "First name").fill("Avery")
        label(page, "Last name").fill("Laurent")
        label(page, "Phone number").press_sequentially("2125550147")
        expect(label(page, "Phone number")).to_have_value("(212) 555-0147")
        label(page, "Password", exact=True).fill("noir2026")
        page.get_by_label(re.compile("or older")).filter(visible=True).check()
        page.get_by_role("button", name="Continue with email").click()
        expect(page.get_by_role("heading", name="Check your email")).to_be_visible()
        label(page, "6-digit code").fill("000000")
        page.get_by_role("button", name="Verify and continue").click()
        # main: Next's route announcer is also role=alert.
        wrong_code = page.locator("main [role=alert]:visible").inner_text()
        page.get_by_role("button", name="Fill it in").click()
        page.screenshot(path=str(OUT / f"{vp_name}-06c-verify.png"))
        page.get_by_role("button", name="Verify and continue").click()
        page.wait_for_url("**/boxes/first-edition")
        step(f"{vp_name}: registered {email} (6 field errors on empty submit; wrong code -> {wrong_code!r}); back on the box")

        open_btn = page.get_by_role("button", name=re.compile(r"^Open the box"))
        expect(open_btn).to_be_enabled(timeout=15_000)
        seal = page.locator("dd[title]").first.get_attribute("title") or ""
        page.screenshot(path=str(OUT / f"{vp_name}-06-box.png"))
        bal_before = page.get_by_label("Wallet").inner_text()

        # Full-length open first: the server answers, then shake -> lid -> the outcome rises -> result.
        open_btn.click()
        page.wait_for_timeout(700)
        page.screenshot(path=str(OUT / f"{vp_name}-07-shaking.png"))
        page.wait_for_timeout(1100)
        page.screenshot(path=str(OUT / f"{vp_name}-07b-rising.png"))
        reveal = page.get_by_role("dialog")
        expect(reveal).to_be_visible(timeout=12_000)
        page.wait_for_timeout(1500)
        page.screenshot(path=str(OUT / f"{vp_name}-08-reveal.png"))
        first_title = page.locator("#reveal-title").inner_text()
        bal_after_open = page.get_by_label("Wallet").inner_text()
        assert len(seal) == 64, f"seal not shown before paying: {seal!r}"
        step(f"{vp_name}: seal {seal[:12]}...; opened -> {first_title!r}; balance {bal_before} -> {bal_after_open}")

        # A piece offers Ship it / Trade in for credit; credit offers Done.
        trade = page.get_by_role("button", name=re.compile(r"^Trade in for"))
        if trade.count() > 0:
            trade.click()
            first_action = "traded in"
        else:
            page.get_by_role("button", name="Done").click()
            first_action = "credit, done"
        expect(reveal).to_be_hidden()
        expect(page.get_by_role("button", name=re.compile(r"^Open the box"))).to_be_enabled(timeout=10_000)
        step(f"{vp_name}: {first_action} -> status {page.get_by_role('status').first.inner_text()!r}; header {page.get_by_label('Wallet').inner_text()!r}")

        # Check the first open, so the next open must clear that verdict (a verdict belongs to one open).
        page.get_by_text("Was it fair").click()
        page.get_by_role("button", name="Check this open").click()
        expect(page.get_by_text(re.compile(r"^Matches"))).to_be_visible(timeout=10_000)

        # Quick open, then close the result.
        page.get_by_text("Quick open").click()
        page.get_by_role("button", name=re.compile(r"^Open the box")).click()
        expect(reveal).to_be_visible(timeout=8_000)
        second_title = page.locator("#reveal-title").inner_text()
        keep = page.get_by_role("button", name="Keep for now")
        (keep if keep.count() > 0 else page.get_by_role("button", name="Done")).click()
        expect(reveal).to_be_hidden()
        step(f"{vp_name}: quick open -> {second_title!r}")
        page.screenshot(path=str(OUT / f"{vp_name}-09-after-open.png"))

        # Analysis now describes the second open: the first open's verdict must be gone until it is checked again.
        expect(page.get_by_role("heading", name="Analysis")).to_be_visible()
        expect(page.get_by_text(re.compile(r"^Matches"))).to_have_count(0)
        page.get_by_text("Was it fair").click()
        page.get_by_role("button", name="Check this open").click()
        expect(page.get_by_text(re.compile(r"^Matches"))).to_be_visible(timeout=10_000)
        page.screenshot(path=str(OUT / f"{vp_name}-09b-analysis.png"))
        step(f"{vp_name}: Analysis 'Check this open' -> matches")
        page.locator("#odds").scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / f"{vp_name}-10-odds.png"))

        page.goto(BASE + "/inventory")
        page.wait_for_timeout(500)
        # Seed one shippable piece so the shipping and trade-in paths always run (most opens pay credit).
        page.evaluate(
            """() => {
              const raw = JSON.parse(localStorage.getItem('mock-session'));
              raw.state.inventory.unshift({ uid: 'e2e-ship', itemId: 'rolex-datejust-36', boxId: 'time-room',
                acquiredAt: new Date().toISOString(), status: 'held',
                draw: { serverSeedHash: 'e2e', clientSeed: 'e2e', nonce: 0, roll: 0 } });
              localStorage.setItem('mock-session', JSON.stringify(raw));
            }"""
        )
        page.reload()
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT / f"{vp_name}-11-inventory.png"), full_page=True)
        page.get_by_role("button", name="Request shipping").first.click()
        step(f"{vp_name}: shipping requested -> {page.get_by_role('status').first.inner_text()!r}")
        page.get_by_role("tab", name=re.compile("Shipping")).click()
        expect(page.get_by_text("Shipping requested", exact=True)).to_be_visible()
        page.get_by_role("button", name="Cancel request").first.click()
        page.get_by_role("tab", name=re.compile("Inventory")).click()
        expect(page.get_by_text("Datejust 36", exact=True)).to_be_visible()
        page.get_by_role("button", name=re.compile(r"^Trade in ·")).first.click()
        expect(page.get_by_role("status").first).to_contain_text("Traded in for", timeout=8_000)
        step(f"{vp_name}: shipping cancelled, then traded in -> {page.get_by_role('status').first.inner_text()!r}; header {page.get_by_label('Wallet').inner_text()!r}")

        page.goto(BASE + "/wallet")
        page.wait_for_timeout(400)
        page.get_by_role("button", name=re.compile(r"\+\$100$")).click()
        step(f"{vp_name}: wallet after +$100 -> {page.get_by_label('Wallet').inner_text()}")
        page.screenshot(path=str(OUT / f"{vp_name}-12-wallet.png"), full_page=True)

        page.goto(BASE + "/provably-fair")
        expect(page.get_by_role("heading", name="Your recent opens")).to_be_visible(timeout=10_000)
        checks = page.get_by_role("button", name="Check", exact=True)
        expect(checks.first).to_be_visible(timeout=10_000)
        listed = checks.count()
        checks.last.click()  # newest first, so the last one is this run's first open
        page.get_by_role("button", name="Verify", exact=True).click()
        expect(page.get_by_text("This open checks out. Matches the API.")).to_be_visible(timeout=10_000)
        page.screenshot(path=str(OUT / f"{vp_name}-13-fair.png"), full_page=True)
        verified = page.locator("dt:text('Outcome') + dd").inner_text()
        assert first_title in verified, f"verifier says {verified!r}, the first open showed {first_title!r}"
        step(f"{vp_name}: verifier ({listed} opens listed) -> {verified!r} matches the first open {first_title!r} and the API")

        page.goto(BASE + "/account")
        expect(page.get_by_role("heading", name="Avery Laurent")).to_be_visible(timeout=10_000)
        page.screenshot(path=str(OUT / f"{vp_name}-14-account.png"), full_page=True)
        page.get_by_role("button", name="Sign out").click()
        page.wait_for_url(BASE + "/")
        page.goto(BASE + "/inventory")
        expect(page.get_by_role("heading", name="Sign in to see your pieces")).to_be_visible(timeout=10_000)
        page.goto(BASE + "/sign-in")
        label(page, "Email", exact=True).fill(email)
        label(page, "Password", exact=True).fill("wrong-pass-1")
        page.get_by_role("button", name="Sign in", exact=True).click()
        expect(page.locator("main [role=alert]:visible")).to_contain_text("don’t match")
        label(page, "Password", exact=True).fill("noir2026")
        page.get_by_role("button", name="Sign in", exact=True).click()
        page.wait_for_url("**/account")
        step(f"{vp_name}: signed out (inventory asks to sign in), wrong password rejected, signed back in")

        page.goto(BASE + "/battles")
        page.goto(BASE + "/legal/terms")
        page.goto(BASE + "/does-not-exist")
        step(f"{vp_name}: 404 heading -> {page.get_by_role('heading', level=1).inner_text()!r}")
        ctx.close()
    browser.close()

(OUT / "result.json").write_text(json.dumps({"log": log, "errors": errors}, indent=2))
print("OUT", OUT)
print("ERRORS", len(errors))
for e in errors:
    print(" ", e)
