# My Book Catalog

A modern, personal book catalog web application built with Next.js, TypeScript, and Tailwind CSS. Track your book collection by author, title, and cover style with powerful search and autocomplete features.

## Features

- **Add Books**: Easily add books with title, author, and cover style information
- **Smart Author Autocomplete**: Google-style shadow autocomplete that suggests previously entered authors as you type
- **Advanced Search**: Search your entire catalog by title, author, or all fields
- **Filter Options**: Toggle between searching all fields, titles only, or authors only
- **Modern UI**: Beautiful, responsive design with gradient backgrounds and smooth animations
- **Persistent Storage**: Server-side storage with Railway volume for data that persists across devices
- **PWA Support**: Install as a Progressive Web App on Android 15 for native-like experience
- **Cross-Device Sync**: Access your catalog from mobile and computer with shared data
- **Offline Support**: Service worker caching for offline access
- **Statistics Dashboard**: View total books, unique authors, and search results at a glance
- **Delete Books**: Remove books from your catalog with confirmation

## Cover Styles Supported

- Hardback
- Softback
- Paperback
- Mass Market Paperback
- Leather Bound
- Board Book

## Getting Started

### Prerequisites

- Node.js 18+ installed on your machine
- npm, yarn, pnpm, or bun package manager

### Installation

1. Clone or navigate to the project directory:
```bash
cd book-catalog
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Adding a Book

1. Fill in the book title
2. Enter the author name (autocomplete will suggest previously entered authors)
3. Select the cover style from the dropdown
4. Click "Add Book"

### Author Autocomplete

- As you type an author's name, if it matches a previously entered author, you'll see a gray shadow suggestion
- Press **Tab** to accept the suggestion
- Continue typing to ignore the suggestion

### Searching Books

1. Use the search bar to enter your search term
2. Toggle between "All", "Title", or "Author" to filter your search
3. Click the X button to clear the search

### Deleting a Book

- Click the trash icon next to any book in the list
- Confirm the deletion in the popup dialog

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Headless UI
- **Icons**: Heroicons
- **Forms**: React Hook Form
- **Storage**: File-based JSON storage with Railway volume
- **PWA**: Service Worker with offline caching
- **Deployment**: Railway with persistent volumes

## Project Structure

```
book-catalog/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── books/
│   │   │       └── route.ts    # API endpoints for CRUD operations
│   │   ├── layout.tsx          # Root layout with PWA metadata
│   │   ├── page.tsx            # Main page component
│   │   ├── register-sw.tsx     # Service worker registration
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── BookForm.tsx        # Add book form with autocomplete
│   │   ├── BookList.tsx        # Book catalog table
│   │   └── SearchBar.tsx       # Search and filter component
│   └── types/
│       └── book.ts             # TypeScript interfaces
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   ├── icon-192.png            # PWA icon (192x192)
│   └── icon-512.png            # PWA icon (512x512)
├── railway.json                # Railway deployment config
├── nixpacks.toml               # Build configuration
└── RAILWAY_DEPLOYMENT.md       # Deployment guide
```

## Deployment

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for complete instructions on deploying to Railway with persistent storage and PWA support.

### Quick Deploy to Railway

1. Connect your GitHub repository to Railway
2. Add a volume mounted at `/data`
3. Set environment variable: `DATA_PATH=/data`
4. Deploy and access your app
5. Install as PWA on your Android device

## License

This project is open source and available for personal use.
