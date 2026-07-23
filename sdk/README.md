# ArtSpace — View in Your Space (embeddable SDK)

Phase 1 of the B2B white-label: the client-side Space editor, packaged as an
iframe app plus a one-line host loader. A gallery drops in a `<script>` tag,
supplies its own catalogue, and receives interactions as events. The visitor's
room photo never leaves the iframe.

## Build

```bash
npm run build:embed        # builds both targets
# → sdk/dist/iframe/…      the hosted editor app (React + Konva)
# → sdk/dist/loader/artspace.js   framework-free host loader (~1 kB gzip)
```

Dev server for the iframe app: `npm run dev:embed`.

## Integrate

```html
<div id="space"></div>
<script src="https://embed.artspace.example/loader/artspace.js"></script>
<script>
  ArtSpace.mount('#space', {
    iframeUrl: 'https://embed.artspace.example/iframe/',
    catalog: [
      {
        id: 'a1',
        title: 'Fluid Cartography',
        imageUrl: 'https://cdn.gallery.com/art/a1.jpg', // MUST be CORS-permissive
        widthCm: 120, heightCm: 90,
        sizes: [{ widthCm: 120, heightCm: 90, priceRange: '$7,400 – $9,000' }],
      },
    ],
    theme: { accent: '#8a6a24' },
    events: { onInquiry: (art) => openMyContactForm(art) },
  });
</script>
```

See `example.html` for a runnable local demo (after building).

## Config

| Field | Notes |
|-------|-------|
| `catalog[]` | `{ id, title, imageUrl, artistName?, widthCm?, heightCm?, sizes? }`. |
| `initialArtworkId?` | Piece the editor opens on. Defaults to the first. |
| `theme?` | `{ accent, surface, fontFamily, radius, name, logoUrl }`. `accent` tints primary actions + selection; `surface`/`fontFamily`/`radius` applied to the editor root and controls. |
| `features?` | `{ room3d, calibration, multiPlacement, download, inquiry }` — **enforced**: off hides/limits that surface (e.g. `multiPlacement:false` makes the picker swap the single piece instead of adding). |
| `events?` | `onInquiry`, `onSelect` (focus change), `onExport` (after download), `onAddToCart`. |
| `imageProxyUrl?` | CORS proxy template with `{url}`, e.g. `https://proxy.gallery.com/?url={url}`. Applied to the anonymous canvas load. |

### Image CORS

Export re-reads artwork pixels into a canvas. Catalogue images **must** send
`Access-Control-Allow-Origin`, or route them through `imageProxyUrl` (a proxy
that adds the header) so the download does not taint.

## How it works

`ArtSpace.mount` injects an iframe (`iframeUrl`), waits for its `ready` message,
posts the serialisable config, sizes the frame to its content, and routes named
events back to the host's callbacks. Event *callbacks* stay on the host — only
serialisable data crosses the boundary (`sdk/src/bridge.ts`).

## Not yet (later phases)

- Phase 3: license key + origin allowlist + validator.
