# Ferramentas da conversão

Scripts usados para gerar e verificar o site estático. Não são necessários para
publicar — o site é `index.html` + `assets/`. Ficam versionados para permitir
regenerar a página se o original mudar.

Dependem de `playwright`, `pixelmatch` e `pngjs`, instalados em
`~/.claude/skills/wordpress-para-estatico/scripts/`.

## `build.js`

Gera o `index.html` a partir do HTML renderizado do site ao vivo.

```bash
curl -s -o live.html -L https://mentoriafisiogestao.com.br/
node tools/build.js live.html .
```

Faz: remove tags do WP e os 18 `<script>`; remove o `<style>` de lazy-load e a
classe `elementor-invisible`; injeta os 4 iframes do YouTube; preserva o GTM;
reescreve `wp-content/...` para `assets/...`.

## `shot-com-bloqueio.mjs`

Captura local e ao vivo para comparação pixel a pixel.

```bash
node tools/shot-com-bloqueio.mjs http://localhost:3333/ https://mentoriafisiogestao.com.br 1280 800 desktop
node ~/.claude/skills/wordpress-para-estatico/scripts/diff.mjs local-desktop.png live-desktop.png d.png
```

Três detalhes que custaram tempo e estão resolvidos no script:

- **Não bloquear `fonts.gstatic.com`.** O live depende dele; bloqueado, cai em
  fonte de fallback mais larga, quebra em mais linhas e mede 89px a mais — falso
  positivo. O local não é afetado (fontes auto-hospedadas).
- **Esperar 4500ms + `getAnimations().finish()`.** Com 2500ms as animações
  `fadeIn*` ainda estão em curso no live e as alturas divergem.
- **`decode()` com timeout.** Duas imagens ficam com `currentSrc` vazio em
  viewport mobile (nos dois lados) e o `decode()` nunca resolve, travando a captura.

## `verify.mjs`

Verificação funcional: hosts contra allowlist, iframes, ícones FontAwesome,
widgets escondidos, erros de console.

```bash
node tools/verify.mjs http://localhost:3333/
```

A allowlist aceita YouTube e Google por decisão de projeto. Qualquer host fora
dela — sobretudo `mentoriafisiogestao.com.br` — é falha real: significa asset não
internalizado.
