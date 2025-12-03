```
 ____
| __ )  ___ _____ ___  _ __ __ _  ___ _ __
|  _ \ / _ \_  / / _ \| '__/ _` |/ _ \ '_ \
| |_) |  __// / | (_) | | | (_| |  __/ | | |
|____/ \___/___  \___/|_|  \__, |\___|_| |_|
           |_____|         |___/
```

# Bezorgen Expense Tracker Dashboard

A modern expense tracking dashboard with Telegram authentication integration. Track your expenses, view analytics, and manage categories with a clean, professional interface.

## Features

- 🔐 **Telegram Authentication** - Secure login via Telegram
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
- Telegram Bot Token (for authentication)

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
VITE_API_BASE_URL=http://localhost:5784
VITE_TELEGRAM_BOT_NAME=your_bot_name
```

### Development

Run the development server:

```bash
bun run dev
```

The app will be available at `http://localhost:5173`

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
