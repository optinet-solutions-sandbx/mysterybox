"""Drive the FLEXD site in flexd/ through its whole loop, at 1440x900 and 390x844, plus 320 wide.

Flow: age gate -> sign-up from Buy (validation, then a real account) -> open a box with a swipe
(frames mid-drag, opening, reveal) -> share sheet -> swipe to sell -> open another (tap) -> keep ->
Collection (ship with address + quote, shipments, sold) -> Wallet (cash out, add funds) ->
Rewards -> Showroom -> box page odds -> shared pull page and its images -> dark only under a
light system -> referral round trip (friend signs up from the link, opens a box, referrer earns
credit) -> help -> 404 -> every page at 320 wide -> reduced motion.

Usage (server from `cd flexd && npx next build && npx next start -p 3312`):
    python scripts/e2e_flexd.py [base_url] [out_dir]
Screenshots and result.json land in out_dir (default: a temp folder, never the repo).
"""
import io
import json
import re
import sys
import tempfile
import urllib.request
from pathlib import Path

from PIL import Image
from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3312"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(tempfile.gettempdir()) / "flexd-e2e"
OUT.mkdir(parents=True, exist_ok=True)

errors: list[str] = []
log: list[str] = []


def step(msg: str) -> None:
    log.append(msg)
    print("STEP", msg, flush=True)


def shot(page, name: str, full: bool = False) -> None:
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=full)


def drag(page, start: tuple[float, float], end: tuple[float, float], steps: int = 12, mid_shot: str | None = None) -> None:
    page.mouse.move(*start)
    page.mouse.down()
    for i in range(1, steps + 1):
        page.mouse.move(start[0] + (end[0] - start[0]) * i / steps, start[1] + (end[1] - start[1]) * i / steps)
        page.wait_for_timeout(16)
        if mid_shot and i == int(steps * 0.6):
            page.wait_for_timeout(250)
            shot(page, mid_shot)
    page.mouse.up()


def center(locator) -> tuple[float, float]:
    b = locator.bounding_box()
    assert b, "element has no box"
    return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2


def money(text: str) -> float:
    return float(re.sub(r"[^\d.]", "", text))


def sign_up(page, username: str, email: str) -> None:
    sheet = page.get_by_role("dialog", name="Create your account")
    expect(sheet).to_be_visible()
    sheet.get_by_label("Username").fill(username)
    sheet.get_by_label("Email").fill(email)
    sheet.get_by_role("checkbox").check()
    sheet.get_by_role("button", name="Create account").click()
    expect(sheet).to_be_hidden()


with sync_playwright() as p:
    # Software WebGL in headless Chromium; its driver notices are environment noise, not app errors.
    browser = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
    for vp_name, vp in [("desktop", {"width": 1440, "height": 900}), ("mobile", {"width": 390, "height": 844})]:
        mobile = vp_name == "mobile"
        ctx = browser.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1, color_scheme="dark")
        ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
        page = ctx.new_page()
        page.on("console", lambda m, v=vp_name: errors.append(f"[{v}] console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e, v=vp_name: errors.append(f"[{v}] pageerror: {e}"))
        user = f"flexd_{vp_name}"

        # Age gate
        page.goto(BASE + "/")
        gate = page.get_by_role("dialog", name=re.compile("18 or older"))
        expect(gate).to_be_visible(timeout=15_000)
        shot(page, f"{vp_name}-01-agegate")
        page.get_by_role("button", name="I'm 18 or older").click()
        expect(gate).to_be_hidden()
        page.wait_for_timeout(1200)
        shot(page, f"{vp_name}-02-home")
        shot(page, f"{vp_name}-03-home-full", full=True)
        step(f"{vp_name}: age gate confirmed, home rendered")

        # Category switch moves the carousel
        page.get_by_role("tab", name="Watches").first.click()
        expect(page.get_by_role("heading", level=2, name="The Time Room")).to_be_visible()
        page.get_by_role("tab", name="All").first.click()
        expect(page.get_by_role("heading", level=2, name="Vanity")).to_be_visible()
        step(f"{vp_name}: category switch shows the Time Room under Watches")

        # Buy while signed out opens sign-up; validation first
        page.get_by_role("button", name="Buy for $147").first.click()
        sheet = page.get_by_role("dialog", name="Create your account")
        expect(sheet).to_be_visible()
        sheet.get_by_role("button", name="Create account").click()
        expect(sheet.get_by_text("Use at least 3 characters.")).to_be_visible()
        expect(sheet.get_by_text("Confirm you are 18 or older.")).to_be_visible()
        shot(page, f"{vp_name}-04-signup-errors")
        sign_up(page, user, f"{user}@example.com")
        expect(page.get_by_text("$2,500.00").first).to_be_visible()
        step(f"{vp_name}: sign-up validated, account created with $2,500.00 demo credit")

        # Open with a swipe
        page.get_by_role("button", name="Buy for $147").first.click()
        scene = page.get_by_role("dialog", name="Opening Vanity")
        expect(scene).to_be_visible()
        expect(scene.get_by_text("Swipe up to open")).to_be_visible()
        page.wait_for_timeout(500)
        shot(page, f"{vp_name}-05-sealed")
        box = scene.get_by_role("img", name="Mystery box")
        cx, cy = center(box)
        drag(page, (cx, cy), (cx, cy - 260), steps=14, mid_shot=f"{vp_name}-06-mid-swipe")
        page.wait_for_timeout(450)
        shot(page, f"{vp_name}-07-opening")
        keep = scene.get_by_role("button", name="Keep it")
        expect(keep).to_be_visible(timeout=5_000)
        page.wait_for_timeout(250)
        shot(page, f"{vp_name}-08-reveal-early")
        page.wait_for_timeout(1400)
        shot(page, f"{vp_name}-09-reveal")
        step(f"{vp_name}: swipe opened the box and revealed the piece")

        # Share sheet
        scene.get_by_role("button", name="Share this pull").click()
        share = page.get_by_role("dialog", name="Share your pull")
        expect(share).to_be_visible()
        expect(share.get_by_role("link", name="Save image for Stories")).to_be_visible()
        page.wait_for_timeout(600)
        shot(page, f"{vp_name}-10-share")
        share.get_by_role("button", name="Copy link").click()
        expect(share.get_by_role("button", name="Link copied")).to_be_visible()
        copied = page.evaluate("navigator.clipboard.readText()")
        assert f"ref={user.upper()}" in copied and "/pull/" in copied, copied
        share.get_by_role("button", name="Close").click()
        expect(share).to_be_hidden()
        step(f"{vp_name}: share sheet copied {copied}")

        # Swipe to sell
        handle = scene.get_by_role("button", name=re.compile(r"^Sell for \$"))
        offer = money(handle.get_attribute("aria-label") or "")
        track = handle.locator("xpath=..")
        tb = track.bounding_box()
        hx, hy = center(handle)
        drag(page, (hx, hy), (tb["x"] + tb["width"] - 20, hy), steps=10)
        expect(page.get_by_text(re.compile(r"^Sold\. \$"))).to_be_visible(timeout=4_000)
        expect(scene.get_by_role("link", name="Go to your wallet")).to_be_visible()
        shot(page, f"{vp_name}-11-sold")
        step(f"{vp_name}: swipe sold the piece for ${offer:.2f}")

        # Open another, tap to open, keep
        scene.get_by_role("button", name="Open another for $147").click()
        scene = page.get_by_role("dialog", name="Opening Vanity")
        scene.get_by_role("button", name="or tap to open").click()
        scene.get_by_role("button", name="Keep it").click(timeout=6_000)
        expect(scene.get_by_role("link", name="Go to your vault")).to_be_visible()
        scene.get_by_role("link", name="Go to your vault").click()
        expect(page).to_have_url(re.compile(r"/collection$"), timeout=15_000)
        expect(scene).to_be_hidden()
        step(f"{vp_name}: second box opened by tap and kept")

        # Collection: ship the kept piece
        piece = page.get_by_role("checkbox", name=re.compile("for shipping")).first
        expect(piece).to_be_visible()
        expect(page.get_by_text(re.compile(r"Sells back in 6d 23h"))).to_be_visible()
        shot(page, f"{vp_name}-12-vault")
        piece.click()
        page.get_by_role("button", name="Ship it").click()
        ship = page.get_by_role("dialog", name="Ship to your door")
        ship.get_by_role("button", name="Review shipping").click()
        expect(ship.get_by_text("Enter a 5-digit ZIP code.")).to_be_visible()
        ship.get_by_label("Full name").fill("Jordan Lee")
        ship.get_by_label("Street address").fill("123 Fulton St")
        ship.get_by_label("City").fill("Brooklyn")
        ship.get_by_label("State").select_option("NY")
        ship.get_by_label("ZIP code").fill("11201")
        ship.get_by_role("button", name="Review shipping").click()
        expect(ship.get_by_text("Shipping, first piece")).to_be_visible()
        shot(page, f"{vp_name}-13-ship-review")
        ship.get_by_role("button", name=re.compile(r"^Pay \$[\d,.]+ and ship$")).click()
        expect(ship.get_by_text("Shipment requested")).to_be_visible()
        expect(ship.get_by_text(re.compile(r"^1Z[0-9A-F]{16}$"))).to_be_visible()
        shot(page, f"{vp_name}-14-ship-done")
        ship.get_by_role("button", name="Done").click()
        page.get_by_role("tab", name=re.compile("^Shipments")).click()
        expect(page.get_by_text("Packing").first).to_be_visible()
        shot(page, f"{vp_name}-15-shipments")
        page.get_by_role("tab", name=re.compile("^Sold")).click()
        expect(page.get_by_text("You sold it", exact=False).first).to_be_visible()
        step(f"{vp_name}: shipment requested with tracking; shipments and sold tabs filled")

        # Wallet: cash out, add funds
        page.goto(BASE + "/wallet")
        withdrawable = money(page.get_by_text("Withdrawable", exact=True).first.locator("xpath=following-sibling::p[1]").inner_text())
        assert abs(withdrawable - offer) < 0.01, (withdrawable, offer)
        page.get_by_role("button", name="Cash out", exact=True).click()
        cash = page.get_by_role("dialog", name="Cash out")
        cash.get_by_role("button", name=re.compile(r"^Cash out \$")).click()
        expect(page.get_by_text(re.compile("is on its way to your Venmo"))).to_be_visible()
        expect(page.get_by_text("Pending").first).to_be_visible()
        page.get_by_role("button", name="Add funds").first.click()
        funds = page.get_by_role("dialog", name="Add funds")
        funds.get_by_role("button", name="$100").click()
        funds.get_by_role("button", name="Add $100").click()
        expect(page.get_by_text("Added $100 to your credit.")).to_be_visible()
        page.wait_for_timeout(400)
        shot(page, f"{vp_name}-16-wallet", full=True)
        step(f"{vp_name}: cashed out ${withdrawable:.2f} (pending), added $100 credit")

        # Rewards, Showroom, box page
        page.goto(BASE + "/rewards")
        expect(page.get_by_text(user.upper()).first).to_be_visible()
        expect(page.get_by_text("Sample data")).to_be_visible()
        shot(page, f"{vp_name}-17-rewards", full=True)
        page.goto(BASE + "/showroom")
        page.get_by_role("tab", name="Watches").click()
        expect(page.get_by_text("5 pieces")).to_be_visible()
        page.get_by_role("button", name=re.compile("Datejust 36")).click()
        expect(page.get_by_role("dialog", name="Rolex").get_by_text("Found in")).to_be_visible()
        shot(page, f"{vp_name}-18-showroom-piece")
        page.keyboard.press("Escape")
        page.goto(BASE + "/box/atelier")
        expect(page.get_by_role("heading", name="Odds")).to_be_visible()
        expect(page.get_by_role("table")).to_be_visible()
        shot(page, f"{vp_name}-19-box-page", full=True)
        step(f"{vp_name}: rewards, showroom filter + piece sheet, box page odds")

        # Shared pull page and its images
        page.goto(BASE + f"/pull/hermes-kelly-28?from=grail-reserve&ref=SOMEONE")
        expect(page.get_by_text("Pulled from")).to_be_visible()
        og = page.locator('meta[property="og:image"]').first.get_attribute("content") or ""
        assert "opengraph-image" in og, og
        shot(page, f"{vp_name}-20-pull-page")
        for path in ["/pull/hermes-kelly-28/story", "/pull/hermes-kelly-28/opengraph-image"]:
            with urllib.request.urlopen(BASE + path) as r:
                assert r.status == 200 and r.headers["content-type"] == "image/png", path
        with urllib.request.urlopen(BASE + "/pull/hermes-kelly-28/opengraph-image") as r:
            corner = Image.open(io.BytesIO(r.read())).convert("RGB").getpixel((4, 4))
        assert corner[2] >= corner[0] and max(corner) < 60, f"link preview corner {corner} is not dark purple"
        step(f"{vp_name}: pull page shows the source box; og:image and story PNGs served")

        # Dark only, even when the system asks for light
        page.emulate_media(color_scheme="light")
        page.goto(BASE + "/")
        assert page.evaluate("document.documentElement.dataset.theme") == "dark"
        bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
        assert bg == "rgb(10, 5, 16)", bg
        shot(page, f"{vp_name}-21-home-light-system")
        page.emulate_media(color_scheme="dark")
        page.get_by_role("button", name="Account").click()
        expect(page.get_by_role("button", name=re.compile("Switch to"))).to_have_count(0)
        step(f"{vp_name}: dark under a light system preference; no theme switch")

        # Referral round trip
        page.get_by_role("button", name="Sign out").click()
        page.goto(BASE + f"/?ref={user.upper()}")
        page.get_by_role("button", name="Sign up").click()
        expect(page.get_by_label("Referral code (optional)")).to_have_value(user.upper())
        sign_up(page, f"friend_{vp_name}", f"friend_{vp_name}@example.com")
        expect(page.get_by_text("$2,505.00").first).to_be_visible()
        page.get_by_role("button", name="Buy for $147").first.click()
        page.get_by_role("button", name="or tap to open").click()
        page.get_by_role("button", name="Keep it").click(timeout=6_000)
        page.get_by_role("button", name="Close").first.click()
        page.get_by_role("button", name="Account").click()
        page.get_by_role("button", name="Sign out").click()
        page.get_by_role("button", name="Sign in").click()
        page.get_by_label("Email or username").fill(f"{user}@example.com")
        page.get_by_role("dialog", name="Sign in").get_by_role("button", name="Sign in").click()
        page.goto(BASE + "/rewards")
        expect(page.get_by_text("You earned").locator("xpath=following-sibling::dd[1]")).to_have_text("$5")
        step(f"{vp_name}: friend got $5 at sign-up; referrer earned $5 on the friend's first box")

        # Help and 404
        page.goto(BASE + "/help")
        page.get_by_text("How long can a piece stay in my vault?").click()
        expect(page.get_by_text(re.compile("7 days. After that it sells back"))).to_be_visible()
        resp = page.goto(BASE + "/does-not-exist")
        assert resp and resp.status == 404
        expect(page.get_by_text("This page isn't here")).to_be_visible()
        step(f"{vp_name}: help answers open; unknown route is a 404")
        ctx.close()

    # Narrowest phones: Cinzel capitals must not push any page sideways
    ctx = browser.new_context(viewport={"width": 320, "height": 568})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"[320] pageerror: {e}"))
    page.goto(BASE + "/")
    page.get_by_role("button", name="I'm 18 or older").click()
    for path in ["/", "/box/time-room", "/collection", "/wallet", "/rewards", "/showroom", "/help"]:
        page.goto(BASE + path)
        page.wait_for_timeout(400)
        overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        assert overflow <= 0, f"{path} scrolls sideways by {overflow}px at 320"
        shot(page, "320" + (path.replace("/", "-") if path != "/" else "-home"))
    # Signed in, the header carries the balance pill and avatar: wider than Sign in / Sign up.
    page.goto(BASE + "/")
    page.get_by_role("button", name="Sign up").click()
    sign_up(page, "narrow_phone", "narrow@example.com")
    page.wait_for_timeout(400)
    overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    assert overflow <= 0, f"signed-in header scrolls sideways by {overflow}px at 320"
    shot(page, "320-home-signed-in")
    step("320 wide: no sideways scroll on any page, signed out or in")
    # A big balance widens the signed-in header's balance pill: check common phone widths.
    page.evaluate(
        """() => { const k = 'flexd'; const s = JSON.parse(localStorage.getItem(k));
        const a = s.state.accounts[s.state.currentId]; a.balances.credit = 99999999; a.balances.withdrawable = 0;
        localStorage.setItem(k, JSON.stringify(s)); }"""
    )
    for w in [320, 360, 375, 384, 390, 412]:
        page.set_viewport_size({"width": w, "height": 740})
        page.goto(BASE + "/")
        expect(page.get_by_role("link", name="Wallet", exact=True)).to_have_text("$999,999.99")
        overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        assert overflow <= 0, f"signed-in header with a $999,999.99 balance scrolls sideways by {overflow}px at {w}"
    shot(page, "412-home-big-balance")
    step("signed-in header fits from 320 to 412 with a six-figure balance")
    ctx.close()

    # Reduced motion: no swipe needed, the reveal is instant
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"[reduced] pageerror: {e}"))
    page.goto(BASE + "/")
    page.get_by_role("button", name="I'm 18 or older").click()
    page.get_by_role("button", name="Sign up").click()
    sign_up(page, "calm_viewer", "calm@example.com")
    page.get_by_role("button", name="Buy for $147").first.click()
    page.get_by_role("button", name="or tap to open").click()
    expect(page.get_by_role("button", name="Keep it")).to_be_visible(timeout=1_500)
    shot(page, "reduced-reveal")
    step("reduced motion: tap reveals the piece at once")
    ctx.close()
    browser.close()

GPU_NOISE = ("GL Driver Message", "GroupMarkerNotSet", "software WebGL", "swiftshader")
errors = [e for e in errors if not any(n in e for n in GPU_NOISE)]
expected = [e for e in errors if "does-not-exist" in e or "404" in e]
unexpected = [e for e in errors if e not in expected]
(OUT / "result.json").write_text(json.dumps({"steps": log, "errors": unexpected, "expected_404": expected}, indent=2))
print(f"\n{len(log)} steps, {len(unexpected)} unexpected console errors")
for e in unexpected:
    print("ERROR", e)
sys.exit(1 if unexpected else 0)
