"""Drive the back office end to end in a real browser (1440 dark, 1440 light, 390 dark).

Flow per viewport: register a player -> open two boxes on the box system -> request a $250 withdrawal ->
/admin refuses the player -> super admin signs in -> dashboard -> Players menu -> player page
(every reference section present; mark the cashout paid, tag, comment, CS lock) -> the player's box
openings -> payments, feed, groups -> boxes & odds -> staff & roles: add an admin -> audit log
(5 entries) -> the new admin signs in: staff page is locked -> the suspended
player can't sign in -> super admin clears the test data -> players list is empty.

Usage (server from `cd web && npx next build && npx next start -p 3210`, demo accounts):
    python scripts/e2e_admin.py [base_url] [out_dir]
The super admin is a throwaway account the script puts in the test browser's own account store
(the same salted-hash scheme as web/src/config/staff.ts), so no team password is needed. To sign in
as a team account instead, set E2E_SUPERADMIN_EMAIL and E2E_SUPERADMIN_PASSWORD.
Screenshots land in out_dir (default: a temp folder, never the repo).
"""
import hashlib, json, os, secrets, sys, re, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3210"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(tempfile.gettempdir()) / "admin-e2e"
OUT.mkdir(parents=True, exist_ok=True)
errors = []
if os.environ.get("E2E_SUPERADMIN_EMAIL"):
    SUPER = (os.environ["E2E_SUPERADMIN_EMAIL"], os.environ["E2E_SUPERADMIN_PASSWORD"])
    SEED_SUPER = None
else:
    SUPER = ("qa.super@grailnoir.com", secrets.token_urlsafe(12))
    salt = secrets.token_hex(16)
    SEED_SUPER = {
        "id": "00000000-0000-4000-8000-0000000a0001", "email": SUPER[0], "firstName": "QA", "lastName": "Super",
        "dial": "+1", "phone": "", "salt": salt, "passwordHash": hashlib.sha256(f"{salt}:{SUPER[1]}".encode()).hexdigest(),
        "marketing": False, "verified": True, "createdAt": "2026-10-15T00:00:00.000Z", "role": "super_admin", "status": "active",
    }

# Adds the throwaway super admin to this browser's demo accounts (store/auth.ts, persist v2) when missing.
SEED_SCRIPT = "" if SEED_SUPER is None else f"""try {{
  const raw = localStorage.getItem('grailnoir-auth');
  const saved = raw ? JSON.parse(raw) : {{ state: {{ accounts: {{}}, currentEmail: null, pending: null }}, version: 2 }};
  saved.state.accounts = saved.state.accounts || {{}};
  if (!saved.state.accounts['{SUPER[0]}']) {{
    saved.state.accounts['{SUPER[0]}'] = {json.dumps(SEED_SUPER)};
    localStorage.setItem('grailnoir-auth', JSON.stringify(saved));
  }}
}} catch (e) {{}}"""

def ctx(b, width, theme):
    c = b.new_context(viewport={"width": width, "height": 900 if width > 500 else 844})
    c.add_init_script(f"""try {{ localStorage.setItem('grailnoir-theme', '{theme}');
      if (!localStorage.getItem('mock-session')) localStorage.setItem('mock-session', JSON.stringify({{state: {{ageConfirmed: true}}, version: 3}})); }} catch (e) {{}}""")
    if SEED_SCRIPT:
        c.add_init_script(SEED_SCRIPT)
    pg = c.new_page()
    pg.set_default_timeout(90000)
    pg.on("console", lambda m: m.type == "error" and errors.append(f"{width}/{theme}: {m.text[:220]}"))
    pg.on("pageerror", lambda e: errors.append(f"{width}/{theme} pageerror: {e}"))
    return c, pg

def vis(pg, sel):
    return pg.locator(sel).filter(visible=True)

def staff_sign_out(pg, width):
    # Sign out lives in the staff member's menu (desktop) or the collapsed menu (phones).
    if width >= 1024:
        vis(pg, "header.sticky button[aria-haspopup='true']").last.click()
    else:
        vis(pg, "header.sticky button[aria-label='Open menu']").click()
    vis(pg, "header.sticky button:has-text('Sign out')").click()
    pg.wait_for_timeout(800)

def staff_sign_in(pg, email, password):
    pg.goto(BASE + "/admin"); pg.wait_for_timeout(1500)
    pg.get_by_label("Work email").filter(visible=True).fill(email)
    vis(pg, "input[autocomplete=current-password]").fill(password)
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
            # The box system (backend kit): open -> result -> keep the piece, or Done for credit.
            btn = pg.get_by_role("button", name=re.compile(r"^Open the box"))
            expect(btn).to_be_enabled(timeout=15000)
            btn.click()
            expect(pg.get_by_role("dialog")).to_be_visible(timeout=12000)
            keep = pg.get_by_role("button", name="Keep for now")
            (keep if keep.count() > 0 else pg.get_by_role("button", name="Done")).click()
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

        # 2) super admin: dashboard -> Players menu -> player page (pay out, tag, comment, CS lock)
        staff_sign_in(pg, *SUPER)
        pg.screenshot(path=f"{OUT}/admin-dashboard-{tag}.png", full_page=True)
        kpis = [t for t in vis(pg, "dl dt").all_inner_texts()][:6]
        print(tag, "kpi labels:", kpis)
        if width >= 1024:
            vis(pg, "nav[aria-label='Back office'] button:has-text('Players')").click()
            vis(pg, "nav[aria-label='Back office'] a:has-text('All players')").click()
        else:
            vis(pg, "header.sticky button[aria-label='Open menu']").click()
            vis(pg, "nav[aria-label='Back office'] a:has-text('All players')").click()
        pg.wait_for_url("**/admin/players"); pg.wait_for_timeout(800)
        pg.goto(BASE + "/admin/players?filter=browser"); pg.wait_for_timeout(1500)
        rows = vis(pg, "tbody tr")
        print(tag, "browser players:", rows.count(), "|", rows.first.inner_text().replace(chr(10), " ")[:160])
        pg.screenshot(path=f"{OUT}/admin-players-{tag}.png", full_page=True)
        rows.first.click()
        pg.wait_for_url("**/admin/players/view?id=*"); pg.wait_for_timeout(1000)
        for section in ["Accounts", "Approx average bonus ratio", "Loyalty points account", "Issued bonuses", "Status", "Player locks", "Tags", "Groups", "Payments", "Comments"]:
            expect(pg.get_by_role("heading", name=section, exact=True).filter(visible=True)).to_be_visible()
        print(tag, "player page title:", vis(pg, "h1").first.inner_text().replace(chr(10), " "))
        pg.screenshot(path=f"{OUT}/admin-player-page-{tag}.png", full_page=True)
        vis(pg, "button:has-text('Mark paid')").click()
        expect(pg.get_by_text("Cashout marked as paid.")).to_be_visible()
        pg.get_by_label("New tag").filter(visible=True).fill("VIP")
        vis(pg, "form:has(input[aria-label='New tag']) button:has-text('Add')").click()
        expect(vis(pg, "li:has-text('VIP')").first).to_be_visible()
        pg.get_by_label("Add a comment for the team").filter(visible=True).fill("QA: called about the cashout.")
        vis(pg, "button:has-text('Save comment')").click()
        expect(pg.get_by_text("QA: called about the cashout.")).to_be_visible()
        vis(pg, "button:has-text('Add CS lock')").click()
        pg.get_by_label("Comment", exact=True).filter(visible=True).fill("QA lock")
        vis(pg, "button:has-text('Save lock')").click()
        expect(pg.get_by_text("Player locked: they can't sign in or play.")).to_be_visible()
        groups = vis(pg, "a:has-text('Group:')").count()
        print(tag, "player page: paid, tagged, commented, CS-locked; status", vis(pg, "dd span:has-text('Suspended')").count() == 1, "| groups:", groups)
        pg.screenshot(path=f"{OUT}/admin-player-page-after-{tag}.png", full_page=True)
        vis(pg, "a:has-text('View')").first.click()
        pg.wait_for_url("**/admin/boxes/openings?player=*"); pg.wait_for_timeout(800)
        print(tag, "openings for player:", vis(pg, "tbody tr").count())
        pg.goto(BASE + "/admin/payments?status=pending"); pg.wait_for_timeout(1000)
        print(tag, "pending payments after payout:", vis(pg, "tbody tr").first.inner_text().strip()[:40])
        pg.goto(BASE + "/admin/payments"); pg.wait_for_timeout(1000)
        pg.screenshot(path=f"{OUT}/admin-payments-{tag}.png", full_page=True)
        pg.goto(BASE + "/admin/feed"); pg.wait_for_timeout(1000)
        print(tag, "feed events:", vis(pg, "main li").count())
        pg.screenshot(path=f"{OUT}/admin-feed-{tag}.png", full_page=True)
        pg.goto(BASE + "/admin/players/groups"); pg.wait_for_timeout(1000)
        pg.screenshot(path=f"{OUT}/admin-groups-{tag}.png", full_page=True)
        pg.goto(BASE + "/admin/players"); pg.wait_for_timeout(1200)
        pg.screenshot(path=f"{OUT}/admin-players-all-{tag}.png")
        pg.goto(BASE + "/admin/boxes"); pg.wait_for_timeout(1200)
        vis(pg, "button:has-text('Odds')").first.click(); pg.wait_for_timeout(500)
        pg.screenshot(path=f"{OUT}/admin-boxes-{tag}.png", full_page=True)
        pg.goto(BASE + "/admin/staff"); pg.wait_for_timeout(1200)
        admin_email = f"qa.admin.{width}.{theme}@grailnoir.com"
        pg.get_by_label("First name").filter(visible=True).fill("Quinn")
        pg.get_by_label("Last name").filter(visible=True).fill("Admin")
        pg.get_by_label("Work email").filter(visible=True).fill(admin_email)
        vis(pg, "button:has-text('Add staff member')").click(); pg.wait_for_timeout(500)
        added = vis(pg, "main [role=status]").first.inner_text()
        admin_password = added.rsplit("Temporary password: ", 1)[1].strip()
        print(tag, "added admin:", added.split(".")[0])
        pg.screenshot(path=f"{OUT}/admin-staff-{tag}.png", full_page=True)
        pg.goto(BASE + "/admin/audit"); pg.wait_for_timeout(1200)
        print(tag, "audit rows (expect 5):", vis(pg, "tbody tr").count())
        pg.screenshot(path=f"{OUT}/admin-audit-{tag}.png", full_page=True)
        sw = pg.evaluate("document.documentElement.scrollWidth")
        print(tag, "scrollWidth", sw)
        staff_sign_out(pg, width)

        # 3) the new admin: staff page locked
        staff_sign_in(pg, admin_email, admin_password)
        pg.goto(BASE + "/admin/staff"); pg.wait_for_timeout(1000)
        print(tag, "admin sees lock:", vis(pg, "h1:has-text('Super admin only')").count() == 1)
        pg.screenshot(path=f"{OUT}/admin-locked-{tag}.png")
        staff_sign_out(pg, width)

        # 4) suspended player can't sign in
        pg.goto(BASE + "/sign-in"); pg.wait_for_timeout(1200)
        vis(pg, "input[type=email]").fill(f"player.{width}.{theme}@example.com")
        vis(pg, "input[autocomplete=current-password]").fill("noir2026")
        pg.get_by_role("button", name="Sign in", exact=True).click(); pg.wait_for_timeout(600)
        print(tag, "suspended sign-in:", vis(pg, "main [role=alert]").inner_text())

        # 5) super admin clears the test data: the back office starts fresh
        staff_sign_in(pg, *SUPER)
        pg.goto(BASE + "/admin/staff"); pg.wait_for_timeout(1000)
        vis(pg, "button:has-text('Clear test data')").click()
        vis(pg, "button:has-text('Delete test data')").click(); pg.wait_for_timeout(400)
        print(tag, "clear:", vis(pg, "main [role=status]").first.inner_text())
        pg.goto(BASE + "/admin/players"); pg.wait_for_timeout(1000)
        print(tag, "players after clear:", vis(pg, "tbody tr").first.inner_text().strip())
        pg.goto(BASE + "/admin/audit"); pg.wait_for_timeout(800)
        print(tag, "audit after clear:", vis(pg, "tbody tr").count(), "row(s)")
        staff_sign_out(pg, width)
        c.close()
    b.close()
print("ERRORS:", errors[:15])
