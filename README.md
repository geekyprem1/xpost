This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Flight branding

Flight is the selected Shotlark logo, used in the editor, login screen, favicon, SVG browser icon, and Apple touch icon. The source mark and font-independent outlined wordmark are in `public/logos/`.

The dashboard theme in `app/globals.css` uses Flight purple (`#6650D8`), wing lavender (`#B4A6F4`), and pale lavender (`#F0ECFC`). Light mode pairs purple actions with white surfaces; dark mode uses lavender actions on plum-charcoal surfaces. Shared semantic tokens keep toolbar states, portalled tabs/popovers, AI controls, and focus indicators consistent. Artwork backgrounds and export colours are independent of the interface theme.

### In-preview post editor & formatting

The post preview now includes an inline editor and rich formatting toolbar modeled after social publishing workflows:
- **Inline Edit / Done toggle**: Click **Edit post** to edit text directly inside the card; click **Done** to preview.
- **Formatting toolbar**: Bold, Italic, Bold-Italic, Underline (`\u0332`), Strikethrough (`\u0336`), Uppercase, Lowercase, Bulleted lists (`• `), Numbered lists (`1. `), Line break, and Clear formatting.
- **Selection-aware**: Select specific words to format only that selection; with nothing selected, styles apply across the post and lists apply to the active line.
- **Keyboard shortcuts & emoji**: `Ctrl+B`, `Ctrl+I`, `Ctrl+U`, and an integrated keyboard-accessible emoji picker.
- **X compatibility**: All formatting uses authentic Unicode mathematical and combining characters that carry over when copying or launching the X intent.

Open the [brand kit](http://localhost:3000/brand/index.html) to preview and download 73 size/colour variants in both PNG and SVG. The complete ZIP is saved at `public/brand/shotlark-flight-brand-kit.zip`; it also contains the browser icons, an offline gallery, and a dimension manifest.

- Profiles: Instagram, Facebook, X, LinkedIn (personal/company), YouTube, TikTok, Threads, Pinterest, Discord, Twitch, and WhatsApp. White, purple, and lavender backgrounds with circular-crop padding.
- Covers: X, Facebook (standard/2×), LinkedIn (personal/company), YouTube, Discord, and Twitch.
- Posts: square, portrait (4:5 and 3:4), landscape, stories/reels, link previews, YouTube thumbnail, Pinterest pin, and Facebook event.
- Transparent icons: 16–2048 px; vector masters include full-colour, black, and white marks and wordmarks.

Regenerate assets, gallery, ZIP, and Next.js icon files with `npm run brand:generate`. Dimensions and reference URLs are recorded in `public/brand/manifest.json`. Platform crops and overlays vary; check each upload preview. Story/reel exports are static artwork, not video.

The [original four-direction comparison](http://localhost:3000/logos/index.html) remains available as a design archive.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
