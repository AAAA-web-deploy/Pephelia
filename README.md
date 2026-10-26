# Pephelia Twin — complete website remake

The approved dark twins, a clickable story atlas, ten distinct 3D chapters, finished copy and a working Next.js / TypeScript / Tailwind website are included together.

## Run

Save the complete ZIP to your computer. On Windows, right-click it and choose **Extract All**, or use WinRAR's **Extract to** command. Choose a short local folder such as `C:\Pephelia`. Open the extracted `Pephelia_Twin_Remake` folder in Cursor. Use Node.js 22.18 or newer.

```sh
npm ci
npm run dev
```

Open the local address printed by the command. No API keys, image generation, external fonts, database or account is required.

## Preview the prebuilt site

```sh
npm run preview
```

This serves `out/` using only Node built-ins, so it works without installing dependencies. Use the printed HTTP address rather than double-clicking HTML.

## Configure launch details

Edit **src/content/token.json**. The name is Pephelia Twin and the working symbol is PEPHELIA. Blue means bull/buy; red means bear/sell. Both factions share one token.

CA, official buy/chart/social URLs, supply, tax and launch date remain blank because they have not been supplied. Unknown facts are not invented. Buy, copy and explorer controls stay inactive until a valid nonzero Ethereum mainnet CA is configured. Blank socials are omitted. With a CA and no custom buy URL, the site derives a Uniswap destination for that exact address. This validates address format, not an audit or checksum certification.

```sh
npm test
npm run typecheck
npm run build
npm run verify
```

## Files

- `src/`: complete Next.js source, chapter copy, token configuration and responsive styles.
- `public/assets/`: optimized full-size/mobile WebP images, portraits, transparent logo and icons.
- `artwork/originals/`: approved hero, ten new chapter PNGs, new atlas, emblem and exact 3:1 banner.
- `out/`: prebuilt root-path static export, including all web assets and local font bundles.
- `docs/`: reference study, story mapping, asset manifest and validation notes.
- `LICENSES/`: font licenses and artwork provenance.
- `CURSOR_PROMPT.md`: concise instructions to configure and finish deployment.
- `.github/workflows/pages.yml`: GitHub Pages workflow.

## GitHub Pages

Push this source to your own repository and choose **GitHub Actions** as the Pages source. The supplied workflow rebuilds with the repository's base path. The included root-path `out/` is for a domain root; the workflow creates the correct subpath export for a project repository.

Manual build for a repository named Pephelia:

```sh
NEXT_PUBLIC_BASE_PATH=/Pephelia npm run build
NEXT_PUBLIC_BASE_PATH=/Pephelia npm run verify
```

PowerShell:

```powershell
$env:NEXT_PUBLIC_BASE_PATH = "/Pephelia"
npm run build
npm run verify
```

The site uses image-led chapters, a full-scene story viewer, artwork downloads, keyboard controls, optional rain audio and a motion preference. Rain starts off. There is no wallet transaction execution, staking service, live-price API, analytics or subscription. No public deployment was performed as part of this ZIP delivery.
