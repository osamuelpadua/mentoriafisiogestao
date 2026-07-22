/**
 * Build específico do mentoriafisiogestao.com.br.
 * Deriva de scripts/build.js da skill, com três divergências decididas pelo usuário:
 *   1. preserva o GTM;
 *   2. injeta os <iframe> do YouTube (o HTML servido traz .elementor-video vazio);
 *   3. sem toggle.js (a página não tem acordeão).
 * Além disso preserva a hierarquia uploads/AAAA/MM/ em assets/images/.
 */
const fs = require('fs');
const path = require('path');

const [liveFile, OUT] = process.argv.slice(2);
const D = 'https://mentoriafisiogestao.com.br';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let h = fs.readFileSync(liveFile, 'utf8');
const before = h.length;

// ---------- 1. mapa de CSS (nomes reais deste site) ----------
const CSS_MAP = {
  'themes/hello-elementor/style.min.css': 'style.min.css',
  'themes/hello-elementor/theme.min.css': 'theme.min.css',
  'plugins/elementor/assets/css/frontend.min.css': 'frontend.min.css',
  'plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css': 'elementor-icons.min.css',
  'plugins/elementor/assets/css/widget-image.min.css': 'widget-image.min.css',
  'plugins/elementor/assets/css/widget-heading.min.css': 'widget-heading.min.css',
  'plugins/elementor/assets/css/widget-video.min.css': 'widget-video.min.css',
  'plugins/elementor/assets/css/widget-divider.min.css': 'widget-divider.min.css',
  'plugins/elementor/assets/css/widget-icon-list.min.css': 'widget-icon-list.min.css',
  'plugins/elementor/assets/lib/animations/styles/fadeInRight.min.css': 'fadeInRight.min.css',
  'plugins/elementor/assets/lib/animations/styles/fadeInLeft.min.css': 'fadeInLeft.min.css',
  'plugins/elementor/assets/lib/animations/styles/fadeInUp.min.css': 'fadeInUp.min.css',
  'plugins/elementor/assets/lib/animations/styles/e-animation-grow.min.css': 'e-animation-grow.min.css',
  'plugins/elementor/assets/lib/font-awesome/css/fontawesome.min.css': 'fontawesome.min.css',
  'plugins/elementor/assets/lib/font-awesome/css/brands.min.css': 'brands.min.css',
  'plugins/elementor/assets/lib/font-awesome/css/solid.min.css': 'solid.min.css',
  'plugins/mask-form-elementor/assets/css/mask-frontend.css': 'mask-frontend.css',
  'uploads/elementor/css/post-8.css': 'post-8.css',
  'uploads/elementor/css/post-31.css': 'post-31.css',
};

// ---------- 2. guardar o GTM antes de remover os <script> ----------
const gtmHead = (h.match(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/) || [])[0];
const gtmBody = (h.match(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/) || [])[0];
if (!gtmHead) console.warn('AVISO: bloco GTM (head) nao encontrado');
if (!gtmBody) console.warn('AVISO: bloco GTM (noscript) nao encontrado');

// ---------- 3. tags do WP ----------
const removed = [];
[
  ['rss', /<link rel="alternate" type="application\/rss\+xml"[^>]*>\s*/g],
  ['oembed', /<link rel="alternate" (title="oEmbed[^>]*|type="application\/json\+oembed"[^>]*|type="text\/xml\+oembed"[^>]*)>\s*/g],
  ['wp-json', /<link rel="alternate" title="JSON"[^>]*>\s*/g],
  ['api.w.org', /<link rel="https:\/\/api\.w\.org\/"[^>]*>\s*/g],
  ['EditURI', /<link rel="EditURI"[^>]*>\s*/g],
  ['shortlink', /<link rel=['"]shortlink['"][^>]*>\s*/g],
  ['canonical', /<link rel="canonical"[^>]*>\s*/g],
  ['preconnect gstatic', /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com\/"[^>]*>\s*/g],
  ['generator', /<meta name="generator"[^>]*>\s*/g],
  ['robots', /<meta name=['"]robots['"][^>]*>\s*/g],
  ['wp-emoji style', /<style id="wp-emoji-styles-inline-css">[\s\S]*?<\/style>\s*/g],
].forEach(([name, re]) => {
  const n = (h.match(re) || []).length;
  if (n) removed.push(`${name}(${n})`);
  h = h.replace(re, '');
});

// ---------- 4. todo JS sai (o GTM volta depois) ----------
const nScripts = (h.match(/<script[\s\S]*?<\/script>/g) || []).length;
h = h.replace(/<script[\s\S]*?<\/script>\s*/g, '');
h = h.replace(/<noscript>[\s\S]*?<\/noscript>\s*/g, '');
removed.push(`script(${nScripts})`);

// ---------- 5. style de lazy-load (senao os fundos somem) ----------
const lazyRe = /<style>\s*\.e-con\.e-parent:nth-of-type\(n\+4\)[\s\S]*?<\/style>\s*/g;
const nLazy = (h.match(lazyRe) || []).length;
h = h.replace(lazyRe, '');
if (nLazy !== 1) throw new Error(`esperava 1 <style> de lazy-load, achei ${nLazy}`);
removed.push('lazy-load style(1)');

// ---------- 5b. elementor-invisible ----------
// .elementor-invisible{visibility:hidden} no frontend.min.css esconde o elemento ate
// o JS do Elementor remover a classe ao entrar na viewport (animacoes fadeIn*).
// Sem o JS, 47 elementos (todos os titulos e a bio) ficariam invisiveis para sempre.
// Remover a classe deixa o elemento no estado FINAL da animacao -- que e o que o
// original exibe depois de animar.
const nInvis = (h.match(/\selementor-invisible/g) || []).length;
h = h.replace(/\selementor-invisible/g, '');
removed.push(`elementor-invisible(${nInvis})`);

// ---------- 6. Google Fonts -> local ----------
const gfRe = /<link rel=['"]stylesheet['"] id=['"]google-fonts-1-css['"][^>]*>/g;
if (!gfRe.test(h)) throw new Error('link do google-fonts nao encontrado');
h = h.replace(gfRe, '<link rel="stylesheet" href="assets/css/fonts.css" media="all">');

// ---------- 7. CSS -> caminhos locais ----------
for (const [remote, local] of Object.entries(CSS_MAP)) {
  const re = new RegExp(esc(D + '/wp-content/' + remote) + '(\\?[^"\']*)?', 'g');
  if (!re.test(h)) console.warn('AVISO: css nao referenciado no html:', remote);
  h = h.replace(new RegExp(esc(D + '/wp-content/' + remote) + '(\\?[^"\']*)?', 'g'), 'assets/css/' + local);
}

// ---------- 8. imagens (preserva AAAA/MM) ----------
h = h.replace(new RegExp(esc(D) + '/wp-content/uploads/([0-9]{4}/[0-9]{2}/[^"\'\\s,)]+)', 'g'),
  (_, f) => 'assets/images/' + f);

// ---------- 9. iframes do YouTube ----------
// O HTML servido traz <div class="elementor-video"></div> vazio: o iframe nasce do JS
// do Elementor. Injetamos o markup renderizado, com os parametros da JS API removidos.
const VIDEOS = {
  '7a02a267': { id: '5vd61jNYNF8', title: 'Mentoria Fisiogestão - Transforme sua carreira e negócio na Fisioterapia' },
  '71a0472d': { id: 'zS-y4ehgwt8', title: 'A importância de escolher uma área de atuação na Fisioterapia' },
  '4918d4ae': { id: 'kKnx2V5M0gE', title: 'A importância do empreendedorismo na Fisioterapia' },
  '3304c1b1': { id: 'wbUpZdMegH8', title: 'Precificação de atendimentos  na Fisioterapia   Aula prática 1' },
};
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let nVid = 0;
for (const [wid, v] of Object.entries(VIDEOS)) {
  // localiza o widget pelo data-id e troca a div vazia pelo iframe
  const re = new RegExp(
    '(data-id="' + wid + '"[\\s\\S]{0,400}?)<div class="elementor-video"><\\/div>');
  if (!re.test(h)) throw new Error('widget de video nao encontrado: ' + wid);
  const src = `https://www.youtube.com/embed/${v.id}?controls=1&amp;rel=0&amp;playsinline=0&amp;modestbranding=0&amp;cc_load_policy=0&amp;autoplay=0`;
  const iframe = `<iframe class="elementor-video" frameborder="0" allowfullscreen="" ` +
    `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
    `referrerpolicy="strict-origin-when-cross-origin" title="${escAttr(v.title)}" ` +
    `width="640" height="360" src="${src}"></iframe>`;
  h = h.replace(re, '$1' + iframe);
  nVid++;
}

// ---------- 10. sobras do dominio ----------
h = h.replace(new RegExp(esc(D) + '/?', 'g'), '');

// ---------- 11. GTM de volta ----------
if (gtmHead) h = h.replace('</head>', gtmHead + '\n</head>');
if (gtmBody) h = h.replace(/(<body[^>]*>)/, '$1\n' + gtmBody);

h = h.replace(/\n[ \t]*\n[ \t]*\n+/g, '\n\n');
fs.writeFileSync(path.join(OUT, 'index.html'), h);

console.log('removido:', removed.join(', '));
console.log('iframes injetados:', nVid);
console.log('GTM preservado:', !!gtmHead, !!gtmBody);
console.log(`index.html: ${before} -> ${h.length} bytes`);

// ---------- 12. url() nos CSS ----------
const cssDir = path.join(OUT, 'assets/css');
for (const f of fs.readdirSync(cssDir)) {
  const p = path.join(cssDir, f);
  const c = fs.readFileSync(p, 'utf8');
  const n = c.replace(new RegExp(esc(D) + '/wp-content/uploads/([0-9]{4}/[0-9]{2}/[^"\')]+)', 'g'),
    (_, x) => '../images/' + x);
  if (n !== c) { fs.writeFileSync(p, n); console.log('css reescrito:', f); }
}
