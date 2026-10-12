"""Drive the back office end to end in a real browser (1440 dark, 1440 light, 390 dark).

Flow per viewport: register a player -> quick-open two boxes -> request a $250 withdrawal ->
/admin refuses the player -> super admin signs in (demo login) -> dashboard -> players filtered to
"This browser" -> player card: mark the withdrawal paid, suspend -> boxes & odds -> staff & roles ->
audit log (2 entries) -> admin signs in: staff page is locked -> the suspended player can't sign in.

Usage (server from `cd web && npx next build && npx next start -p 3210`):
    python scripts/e2e_admin.py [base_url] [out_dir]
Screenshots land in out_dir (default: a temp folder, never the repo).
"""
import sys, re, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3210"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(tempfile.gettempdir()) / "admin-e2e"
OUT.mkdir(parents=True, exist_ok=True)
errors = []

def ctx(b, width, theme):
    c = b.new_context(viewport={"width": width, "height": 900 if width > 500 else 844})
    c.add_init_script(f"""try {{ localStorage.setItem('grailnoir-theme', '{theme}');
      if (!localStorage.getItem('mock-session')) localStorage.setItem('mock-session', JSON.stringify({{state: {{ageConfirmed: true}}, version: 2}})); }} catch (e) {{}}""")
    pg = c.new_page()
    pg.set_default_timeout(90000)
    pg.on("console", lambda m: m.type == "error" and errors.append(f"{width}/{theme}: {m.text[:220]}"))
    pg.on("pageerror", lambda e: errors.append(f"{width}/{theme} pageerror: {e}"))
    return c, pg

def vis(pg, sel):
    return pg.locator(sel).filter(visible=True)

def staff_sign_in(pg, which):
    pg.goto(BASE + "/admin"); pg.wait_for_timeout(1500)
    vis(pg, f"li:has-text('{which}') button:has-text('Use this login')").first.click()
    vis(pg, "button:has-text('Sign in to the back office')").click()
    expect(pg.get_by_role("heading", name="Dashboard")).to_be_visible()
    pg.wait_for_timeout(800)

with sync_playwright() as p:
    b = p.chromium.launch()
    for width, theme in [(1440, "dark"), (1440, "light"), (390, "dark")]:
        tag = f"{width}-{theme}"
        c, pg = ctx(b, width, theme)
        # 1) a player registers, opens two boxes, requests a withdrawal
        pg.goto(BASE + "/register"); pg.wait_for_timeout(1500)
        vis(pg, "input[type=email]").fill(f"player.{width}.{theme}@example.com")
        pg.get_by_label("First name").filter(visible=True).fill("Riley")
        pg.get_by_label("Last name").filter(visible=True).fill("Quintero")
        vis(pg, "input[type=tel]").type("3105550188")
        vis(pg, "input[autocomplete=new-password]").type("noir2026")
        pg.get_by_label(re.compile("or older")).filter(visible=True).check()
        vis(pg, "button:has-text('Continue with email')").click()
        vis(pg, "button:has-text('Fill it in')").click()
        vis(pg, "button:has-text('Verify and continue')").click()
        pg.wait_for_url("**/account")
        pg.goto(BASE + "/boxes/first-edition"); pg.wait_for_timeout(1500)
        pg.get_by_text("Quick open").filter(visible=True).click()
        for _ in range(2):
            pg.get_by_role("button", name=re.compile(r"^Open for")).click()
            expect(pg.get_by_role("dialog")).to_be_visible(timeout=8000)
            pg.get_by_role("button", name="Keep it").click()
            expect(pg.get_by_role("dialog")).to_be_hidden()
        pg.goto(BASE + "/wallet"); pg.wait_for_timeout(1200)
        vis(pg, "input[inputmode=decimal]").fill("250")
        vis(pg, "button:has-text('Request')").click()
        pg.wait_for_timeout(400)
        print(tag, "wallet notice:", vis(pg, "form [role=status]").first.inner_text())
        pg.screenshot(path=f"{OUT}/wallet-withdraw-{tag}.png", full_page=True)
        # player can't use the back office
        pg.goto(BASE + "/admin"); pg.wait_for_timeout(1200)
        print(tag, "player at /admin:", vis(pg, "p:has-text('signed in as a player')").count() == 1)
        vis(pg, "button:has-text('Sign out')").first.click(); pg.wait_for_timeout(800)

        # 2) super admin: dashboard, players, drawer, boxes, staff, audit
        staff_sign_in(pg, "Super admin")
        pg.screenshot(path=f"{OUT}/admin-dashboard-{tag}.png", full_page=True)
        kpis = [t for t in vis(pg, "dl dt").all_inner_texts()][:6]
        print(tag, "kpi labels:", kpis)
        pg.goto(BASE + "/admin/players?filter=browser"); pg.wait_for_timeout(1500)
        rows = vis(pg, "tbody tr")
        print(tag, "browser players:", rows.count(), "|", rows.first.inner_text().replace("\n", " ")[:160])
        pg.screenshot(path=f"{OUT}/admin-players-{tag}.png", full_page=True)
        rows.first.click(); pg.wait_for_timeout(800)
        pg.screenshot(path=f"{OUT}/admin-player-card-{tag}.png")
        vis(pg, "button:has-text('Mark paid')").click(); pg.wait_for_timeout(300)
        print(tag, "settle:", vis(pg, "[role=dialog] [role=status]").inner_text())
        vis(pg, "button:has-text('Suspend player')").click(); pg.wait_for_timeout(300)
        print(tag, "suspend:", vis(pg, "[role=dialog] [role=status]").inner_text())
        pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
        pg.goto(BASE + "/admin/players"); pg.wait_for_timeout(1200)
        pg.screenshot(path=f"{OUT}/admin-players-all-{tag}.png")
        pg.goto(BASE + "/admin/boxes"); pg.wait_for_timeout(1200)
        vis(pg, "button:has-text('Odds')").first.click(); pg.wait_for_timeout(500)
        pg.screenshot(path=f"{OUT}/admin-boxes-{tag}.png", full_page=True)
        pg.goto(BASE + "/admin/staff"); pg.wait_for_timeout(1200)
        pg.screenshot(path=f"{OUT}/admin-staff-{tag}.png", full_page=True)
        pg.goto(BASE + "/admin/audit"); pg.wait_for_timeout(1200)
        print(tag, "audit rows:", vis(pg, "tbody tr").count())
        pg.screenshot(path=f"{OUT}/admin-audit-{tag}.png", full_page=True)
        sw = pg.evaluate("document.documentElement.scrollWidth")
        print(tag, "scrollWidth", sw)
        vis(pg, "button:has-text('Sign out')").first.click(); pg.wait_for_timeout(800)

        # 3) admin: staff page locked
        staff_sign_in(pg, "Admin")
        pg.goto(BASE + "/admin/staff"); pg.wait_for_timeout(1000)
        print(tag, "admin sees lock:", vis(pg, "h1:has-text('Super admin only')").count() == 1)
        pg.screenshot(path=f"{OUT}/admin-locked-{tag}.png")
        vis(pg, "button:has-text('Sign out')").first.click(); pg.wait_for_timeout(800)

        # 4) suspended player can't sign in
        pg.goto(BASE + "/sign-in"); pg.wait_for_timeout(1200)
        vis(pg, "input[type=email]").fill(f"player.{width}.{theme}@example.com")
        vis(pg, "input[autocomplete=current-password]").fill("noir2026")
        pg.get_by_role("button", name="Sign in", exact=True).click(); pg.wait_for_timeout(600)
        print(tag, "suspended sign-in:", vis(pg, "main [role=alert]").inner_text())
        c.close()
    b.close()
print("ERRORS:", errors[:15])
