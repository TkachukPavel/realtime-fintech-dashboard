# Realtime Fintech Dashboard

Live demo: [Realtime Fintech Dashboard](https://tkachukpavel.github.io/realtime-fintech-dashboard/)

A small Angular application for monitoring simulated financial market activity in real time. It implements the requirements described in [TASK.md](./TASK.md): a live market dashboard, configurable data-producer settings, and a market-update generator written in AssemblyScript, compiled to WebAssembly, and run in a Web Worker.

## Application

The application has two pages:

- **Dashboard** — displays fictional instruments and their latest traded price, bid–ask spread, cumulative trading volume, cumulative volume-weighted average price (VWAP), and order-book imbalance. It also shows producer status and lets you pause or resume generation.
- **Settings** — configures instrument count, updates per batch, and batch interval. Applying valid settings starts a new run using those settings.

The producer generates individual trades and bid/ask snapshots in WebAssembly. Its state is retained between batches, and the dashboard aggregates every trade for the current run rather than storing the full event history.

## Requirements

- Node.js and npm

## Install and run

Install the dependencies, then start the development server:

```bash
npm install
npm start
```

The `start` script compiles the AssemblyScript generator to WebAssembly before starting Angular. Open [http://localhost:4200](http://localhost:4200) in your browser.

## Test

Run the Angular unit tests:

```bash
npm test
```

This script compiles the WebAssembly generator first, then runs the Angular unit tests with Karma and Jasmine.

Run the generator checks against the compiled WebAssembly module separately:

```bash
npm run test:wasm
```

These checks cover generator initialization, batch sizes, generated value constraints, gradual price changes, and seeded reproducibility.

## Production build

Build the application for production:

```bash
npm run build
```

The build script compiles the WebAssembly generator and then builds the Angular application. Angular build output is written to `dist/`.

## Technology stack

- **Angular 20** and **TypeScript** for the application, routing, forms, and unit tests.
- **AssemblyScript** for the market-data generator, compiled to **WebAssembly**.
- **Web Worker** for running the producer away from the UI thread.
- **RxJS** for reactive event/data handling.
- **Angular Material** and **Angular CDK** for interface components and UI utilities.
- **Tailwind CSS 4** with **PostCSS** for styling.
- **Karma** and **Jasmine** for Angular unit tests; Node.js assertions exercise the compiled Wasm generator.
