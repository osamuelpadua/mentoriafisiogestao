# Mentoria Fisio Gestão — site estático

Versão estática de `https://mentoriafisiogestao.com.br/`, convertida de WordPress +
Elementor (tema hello-elementor, page id 31, kit 8) para HTML + CSS puro.

Sem PHP, sem banco de dados, sem WordPress. Publicável em qualquer host estático
(GitHub Pages, Netlify, Vercel, S3, Apache/nginx).

## Estrutura

```
index.html
assets/
  css/       19 folhas na ordem original do <head> + fonts.css
  fonts/     Catamaran, Quicksand, Roboto (auto-hospedadas) + eicons
  webfonts/  FontAwesome 5 (brands + solid)
  images/    15 imagens, hierarquia AAAA/MM preservada
```

## Rodar localmente

Precisa de um servidor HTTP com Content-Type correto — abrir o `index.html` direto
pelo `file://` faz os `.woff2` falharem:

```bash
npx serve .
# ou
python -m http.server 3333
```

## Verificação

Comparação pixel a pixel contra o site original — **0 pixels diferentes** nos dois
viewports:

| Viewport | Dimensões | Pixels comparados | Diferentes |
|---|---|---|---|
| Desktop | 1280 × 7315 | 9.363.200 | **0** |
| Mobile  | 390 × 11193 | 4.365.270 | **0** |

## Carregamento externo

A página **não** é autocontida, por decisão de projeto:

- **YouTube** — os 4 vídeos são `<iframe>` de `youtube.com/embed/`, como no original.
- **Google Tag Manager** — container `GTM-54NCWVTJ` preservado (GA4 `G-V4NXSRD5EL`
  e Google Ads `AW-16836026780`).

Todo o resto — CSS, fontes, imagens — é servido localmente.

> **Nota sobre a conversão do Google Ads:** o site dispara um evento de conversão
> (`purchase`, valor 0) a cada carregamento de página, não em uma ação do visitante.
> Esse comportamento foi herdado do original e mantido sem alteração.

## Defeitos herdados do original

Reproduzidos de propósito, para fidelidade:

1. **Fonte Metropolis** — declarada em 3 regras do CSS, mas sem `@font-face` em
   lugar nenhum e ausente do backup. Já caía no `Sans-serif` no WordPress.
2. **Âncora `#mform`** — um botão aponta para `#mform`, elemento que não existe
   na página. O clique não vai a lugar nenhum, igual ao original.
3. **Duas imagens sem `currentSrc` em viewport mobile** (`selo-garantia-02.png` e
   `WhatsApp_Image_2025-04-16...`) — o `srcset`/`sizes` gerado pelo WordPress não
   resolve nenhuma fonte nessa largura. Ocorre igualmente no site ao vivo.

Todos são corrigíveis, mas corrigir criaria divergência visual proposital.

## Origem dos arquivos

- **HTML e CSS gerados pelo Elementor** (`post-8.css`, `post-31.css`): capturados do
  site no ar — não existem em forma utilizável num backup de arquivos.
- **CSS de tema/plugin, imagens e webfonts**: backup de arquivos. Os 17 CSS foram
  conferidos byte a byte contra o site ao vivo — todos idênticos.
- **Fontes Google**: baixadas e auto-hospedadas (subsets latin/latin-ext).

## O que foi removido do WordPress

Tags de RSS, oEmbed, `api.w.org`, EditURI, canonical, shortlink, generator, robots,
`wp-json`, estilos wp-emoji, os 18 `<script>` (jQuery + Elementor) e o `<style>` de
lazy-load do Elementor.

Duas remoções que exigem atenção em qualquer atualização:

- **`<style>` de lazy-load** — a regra `.e-con.e-parent:nth-of-type(n+4)` zera o
  `background-image` até o JS adicionar `.e-lazyloaded`. Sem JS, os fundos sumiriam.
- **Classe `elementor-invisible`** (47 ocorrências) — `visibility:hidden` até o JS
  do Elementor removê-la ao entrar na viewport, para as animações `fadeIn*`. Sem JS,
  todos os títulos e a bio ficariam invisíveis para sempre. Remover a classe deixa o
  elemento no estado final da animação, que é o que o original exibe.
