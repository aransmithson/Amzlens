# Amzlens 🔍

> Optical Barcode Scanner & Amazon Selling Partner Multi-Marketplace Catalog Investigator.

**Amzlens** allows you to scan or photograph any retail barcode (EAN-13, UPC-A, Code-128, ISBN) and instantly retrieve the matching Amazon catalog listing, ASIN, Buy Box pricing, sales rank, customer reviews, and direct product links across 7 regional Amazon stores:
- 🇺🇸 **USA** (`amazon.com`)
- 🇬🇧 **United Kingdom** (`amazon.co.uk`)
- 🇮🇹 **Italy** (`amazon.it`)
- 🇫🇷 **France** (`amazon.fr`)
- 🇪🇸 **Spain** (`amazon.es`)
- 🇩🇪 **Germany** (`amazon.de`)
- 🇮🇪 **Ireland** (`amazon.ie`)
- 🇨🇦 **Canada** (`amazon.ca`)

---

## ✨ Features

- **Live Camera Viewfinder**: High-speed frame scanning with laser reticle, front/rear camera toggle, and torch control.
- **Photograph / Snapshot Upload**: Drag-and-drop packaging photos or snap pictures with mobile camera shutter.
- **Manual UPC / Barcode Entry**: Quick lookup with one-click test sample chips.
- **Amazon SP-API Integration**: Catalog Items API (`v2022-04-01`) with automatic LWA token negotiation and candidate format resolution.
- **Regional SP-API Token Isolation**: Supports distinct **Europe Refresh Tokens** (`eu-west-1`) vs **North America Refresh Tokens** (`us-east-1`).
- **Offline / Demo Safe Mode**: Realistic seeded catalog database with procedural catalog generator for instant offline testing.
- **Investigation History**: Session log with 1-click CSV export.

---

## 🚀 Getting Started

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## ☁️ Cloudflare Pages Deployment

- **GitHub Repository**: [https://github.com/aransmithson/Amzlens](https://github.com/aransmithson/Amzlens)
- **Cloudflare Pages URL**: [https://amzlens.pages.dev/](https://amzlens.pages.dev/)
