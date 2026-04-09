# Cofr — Expense Tracker Dashboard

A modern expense tracking dashboard. Track your expenses, view analytics, and manage categories with a clean, professional interface.

## Features

- 🔐 **Authentication** - Secure login via Google OAuth or email/password
- 📊 **Expense Tracking** - View and manage all your expenses
- 📈 **Analytics** - Monthly statistics and category breakdowns
- 🎨 **Category Management** - 14 predefined expense categories with color coding
- 📱 **Responsive Design** - Works on desktop and mobile devices
- ⚡ **Fast & Modern** - Built with React Router v7 and Tailwind CSS

## Tech Stack

- **Framework**: React Router v7
- **Runtime**: Bun
- **Styling**: Tailwind CSS v4
- **Validation**: Zod
- **Language**: TypeScript

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3.3 or higher
- A running cofr server instance

### Installation

1. Install dependencies:

```bash
bun install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
VITE_API_BASE_URL=/api
```

### Development

Run the development server:

```bash
bun run dev
```

The app will be available at `http://localhost:5173`

If you run the full Docker dev stack, use `http://localhost:8080` instead. In that setup the client talks to the backend through Caddy at `/api`.

### Production

Build for production:

```bash
bun run build
```

Start the production server:

```bash
bun run start
```

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run typecheck` - Run TypeScript type checking
- `bun run lint` - Lint code with Biome
- `bun run format` - Format code with Biome
- `bun run check` - Run lint and format together
