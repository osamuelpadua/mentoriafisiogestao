/**
 * Verificacao funcional do estatico. Rede: allowlist explicita (YouTube + Google),
 * por decisao do usuario. Host fora da lista -- sobretudo mentoriafisiogestao.com.br --
 * e falha real: significa asset nao internalizado.
 */
import { chromium } from 'playwright';

const TARGET = process.argv[2] || 'http://localhost:3333/';
// host inclui a porta -> localhost:3333. Dominios do player do YouTube (ggpht,
// jnn-pa, gstatic) e do GTM entram por decisao do usuario.
const ALLOW = /^(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|(www\.)?youtube\.com|.*\.ytimg\.com|.*\.ggpht\.com|.*\.googlevideo\.com|jnn-pa\.googleapis\.com|www\.googletagmanager\.com|www\.google-analytics\.com|.*\.doubleclick\.net|www\.googleadservices\.com|www\.google\.com|www\.google\.com\.br|(www|fonts)\.gstatic\.com|play\.google\.com)$/;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const hosts = new Map(), erros = [], falhas = [];
p.on('request', r => { const h = new URL(r.url()).host; hosts.set(h, (hosts.get(h) || 0) + 1); });
p.on('requestfailed', r => falhas.push(r.url().slice(0, 110)));
p.on('response', r => { if (r.status() >= 400) falhas.push(r.status() + ' ' + r.url().slice(0, 100)); });
p.on('console', m => { if (m.type() === 'error') erros.push(m.text().slice(0, 160)); });
p.on('pageerror', e => erros.push('PAGEERROR ' + e.message.slice(0, 160)));

await p.goto(TARGET, { waitUntil: 'networkidle' });
await p.evaluate(async () => {
  const H = document.body.scrollHeight;
  for (let y = 0; y < H; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
  window.scrollTo(0, 0);
  await document.fonts.ready;
});
await p.waitForTimeout(3000);

console.log('=== HOSTS ===');
let ruim = 0;
for (const [h, n] of [...hosts].sort()) {
  const ok = ALLOW.test(h);
  if (!ok) ruim++;
  console.log(`  ${ok ? 'ok  ' : 'FORA'} ${h} (${n})`);
}

const r = await p.evaluate(() => {
  const cs = getComputedStyle(document.querySelector('.fab.fa-facebook-f'), '::before');
  const solid = getComputedStyle(document.querySelector('.fas.fa-chevron-right'), '::before');
  return {
    iframes: [...document.querySelectorAll('iframe.elementor-video')].map(f => ({
      w: Math.round(f.getBoundingClientRect().width), h: Math.round(f.getBoundingClientRect().height),
      src: f.src.slice(0, 46),
    })),
    faBrandsFont: cs.fontFamily, faBrandsGlyph: cs.content,
    faSolidFont: solid.fontFamily, faSolidGlyph: solid.content,
    nIcons: document.querySelectorAll('.fab,.fas').length,
    invisiveis: document.querySelectorAll('.elementor-invisible').length,
    escondidos: [...document.querySelectorAll('.elementor-widget')]
      .filter(e => getComputedStyle(e).visibility === 'hidden').length,
    ancora: !!document.querySelector('#form'),
    mform: !!document.querySelector('#mform'),
    title: document.title,
    lang: document.documentElement.lang,
  };
});

console.log('\n=== VIDEOS ===');
r.iframes.forEach(f => console.log(`  ${f.w}x${f.h}  ${f.src}`));
console.log('\n=== ICONES ===');
console.log('  total .fab/.fas:', r.nIcons);
console.log('  brands:', r.faBrandsFont, r.faBrandsGlyph);
console.log('  solid :', r.faSolidFont, r.faSolidGlyph);
console.log('\n=== ESTADO ===');
console.log('  .elementor-invisible restantes:', r.invisiveis, '| widgets hidden:', r.escondidos);
console.log('  ancora #form:', r.ancora, '| #mform:', r.mform, '(quebrada tambem no original)');
console.log('  title:', JSON.stringify(r.title), '| lang:', r.lang);

console.log('\n=== FALHAS DE REDE ===');
console.log(falhas.length ? falhas.map(x => '  ' + x).join('\n') : '  (nenhuma)');
console.log('\n=== ERROS DE CONSOLE ===');
console.log(erros.length ? erros.map(x => '  ' + x).join('\n') : '  (nenhum)');

await b.close();
const falhouLocal = falhas.filter(f => /localhost|mentoriafisiogestao/.test(f));
console.log('\nRESULTADO:', (ruim === 0 && falhouLocal.length === 0) ? 'OK' : 'REVISAR');
process.exit(ruim === 0 && falhouLocal.length === 0 ? 0 : 1);
