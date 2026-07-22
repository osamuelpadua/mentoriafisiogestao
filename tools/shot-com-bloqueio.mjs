import { chromium } from 'playwright';
const BLOCK = /youtube\.com|ytimg\.com|youtube-nocookie|googletagmanager|google-analytics|doubleclick|googleadservices|google\.com\/(ccm|pagead|rmkt)|google\.com\.br\/pagead/;
const [local, live, w = 390, h = 844, tag = 'mobile'] = process.argv.slice(2);
const log = (...a) => console.log(new Date().toISOString().slice(14, 19), ...a);

const browser = await chromium.launch();
for (const [name, url] of [['local', local], ['live', live]]) {
  log(name, 'inicio');
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.route('**/*', r => BLOCK.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  log(name, 'domcontentloaded');
  await page.waitForLoadState('load', { timeout: 30000 }).catch(e => log(name, 'load timeout (ok)'));
  log(name, 'load');
  await page.evaluate(async () => {
    const H = document.body.scrollHeight;
    for (let y = 0; y < H; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
    // decode() nunca resolve para img com currentSrc vazio (acontece nos DOIS lados
    // em viewport mobile, por srcset/sizes). Corrida com timeout evita travar.
    await Promise.all([...document.images].map(i => Promise.race([
      i.decode().catch(() => {}),
      new Promise(r => setTimeout(r, 3000)),
    ])));
    await document.fonts.ready;
  });
  log(name, 'scroll+fonts ok, altura=', await page.evaluate(() => document.body.scrollHeight));
  await page.waitForTimeout(4500);
  await page.evaluate(() => document.getAnimations().forEach(a => a.finish()));
  await page.waitForTimeout(300);
  log(name, 'capturando...');
  await page.screenshot({ path: `${name}-${tag}.png`, fullPage: true, animations: 'disabled', timeout: 60000 });
  log(name, '-> ' + `${name}-${tag}.png`);
  await page.close();
}
await browser.close();
log('fim');
