# Ediv Finance

**Escola do Dividendo** — a financial education and stock research platform focused on understanding companies, dividends, and investment scenarios.

[Visit the website](https://escoladodividendo.com.br) · [Setup and technical documentation](evorix-finance/README.md)

## What the platform includes

- Stock research rankings and company pages with research scenarios and statistics.
- A publishing workflow for Analysts and Administrators, with an editor, CSV/XLSX imports, previews, and version history.
- Stock market data from brapi.dev.
- Learning content about dividend investing.
- Email-verified accounts, role-based access, and support tools.

The application interface is in Brazilian Portuguese.

## Stack

React, TypeScript, and Vite on the frontend; Node.js and Express for the API; MySQL for persistence. The application is deployed on Vercel with a managed MySQL database.

## Repository layout

The application lives in the nested `evorix-finance/` directory:

```sh
cd evorix-finance
```

Read the [application README](evorix-finance/README.md) for requirements, environment configuration, database migrations, local development, API details, security guidance, and deployment instructions.

Production uses `main`. The `QA` branch provides a separate preview environment for evaluation.
