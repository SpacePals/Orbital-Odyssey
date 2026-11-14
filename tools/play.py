import sys, time, json
from playwright.sync_api import sync_playwright

scn = sys.argv[1] if len(sys.argv) > 1 else 'leo'
builds = {
  'leo': ['cam','msi','si','batt','omni','ride'],
  'europa': ['maspex','msi','rtg','batt','dish','heavy'],
  'leogood': ['cam','msi','uflex','batt','dish','ka','ride'],
  'bad': ['cam','si','omni','ride'],
}
build = builds[sys.argv[2] if len(sys.argv) > 2 else scn]
out = '/tmp/shots_' + scn + '_' + (sys.argv[2] if len(sys.argv) > 2 else scn)
import os; os.makedirs(out, exist_ok=True)
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width':1440,'height':860})
    pg.on('console', lambda m: errs.append(('console', m.type, m.text)) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append(('pageerror', str(e))))
    pg.goto('http://localhost:3000/')
    pg.wait_for_timeout(800)
    pg.click('.scn-card[data-scn="%s"]' % scn)
    pg.wait_for_timeout(300)
    pg.screenshot(path=out+'/01_title.png')
    pg.click('#btnStart')
    pg.wait_for_timeout(600)
    for cid in build:
        tab = {'cam':'science','msi':'science','radar':'science','maspex':'science','si':'power','uflex':'power','rtg':'power','batt':'power','omni':'telecom','dish':'telecom','ka':'telecom','ride':'launch','heavy':'launch','super':'launch'}[cid]
        pg.click('.tab[data-tab="%s"]' % tab)
        pg.click('.card[data-id="%s"]' % cid)
        pg.wait_for_timeout(250)
    pg.wait_for_timeout(1800)
    pg.click('.tab[data-tab="science"]')
    pg.wait_for_timeout(300)
    pg.screenshot(path=out+'/02_config.png')
    pg.click('#btnLaunch')
    pg.wait_for_timeout(2600)
    pg.screenshot(path=out+'/03_launch_a.png')
    pg.wait_for_timeout(3500)
    pg.screenshot(path=out+'/03_launch_b.png')
    pg.wait_for_timeout(4500)
    pg.screenshot(path=out+'/03_launch_c.png')
    pg.wait_for_timeout(3500)
    scr = pg.evaluate("document.body.getAttribute('data-screen')")
    print('screen after launch', scr)
    if scr == 'launch':
        pg.wait_for_timeout(2000)
        pg.screenshot(path=out+'/03_launch_fail.png')
        print(pg.evaluate("document.getElementById('failModal').innerText.slice(0,400)"))
    else:
        # ops: take screenshots periodically, and react to crises
        t0 = time.time()
        shots = 0
        cnt = {}
        while time.time() - t0 < 140:
            scr = pg.evaluate("document.body.getAttribute('data-screen')")
            if scr != 'ops': break
            ph = pg.evaluate("document.getElementById('opsPanel').getAttribute('data-crisis')")
            if ph == 'seu':
                pg.click('#swBackup'); pg.wait_for_timeout(300); pg.click('#btnReboot')
            if ph == 'eclipse' and shots == 0:
                pass
            if ph == 'dsn':
                pg.click('#swBoost')
                pg.click('#thrCtl button[data-th="0.25"]')
            if ph and cnt.get(ph,0) < 2:
                pg.screenshot(path=out+'/04_ops_%s_%d.png' % (ph, cnt.get(ph,0))); cnt[ph]=cnt.get(ph,0)+1
            pg.wait_for_timeout(1500)
        print('ops loop end', pg.evaluate("document.body.getAttribute('data-screen')"))
        pg.wait_for_timeout(5000)
        pg.screenshot(path=out+'/05_debrief.png', full_page=True)
    print(json.dumps(errs, indent=1)[:3000])
    b.close()
