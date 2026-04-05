import { NextRequest, NextResponse } from 'next/server';
import { Book } from '@/types/book';

const GIST_ID_FILE = process.env.DATA_PATH
  ? `${process.env.DATA_PATH}/gist_id.txt`
  : null;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_FILENAME = 'book-catalog-backup.json';

async function getSavedGistId(): Promise<string | null> {
  if (!GIST_ID_FILE) return null;
  try {
    const { promises: fs } = await import('fs');
    const id = await fs.readFile(GIST_ID_FILE, 'utf-8');
    return id.trim() || null;
  } catch {
    return null;
  }
}

async function saveGistId(id: string): Promise<void> {
  if (!GIST_ID_FILE) return;
  try {
    const { promises: fs } = await import('fs');
    await fs.writeFile(GIST_ID_FILE, id, 'utf-8');
  } catch {
    // non-fatal
  }
}

export async function POST(request: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: 'GITHUB_TOKEN environment variable is not set. Add it in Railway dashboard.' },
      { status: 500 }
    );
  }

  try {
    const { books }: { books: Book[] } = await request.json();

    const content = JSON.stringify({ savedAt: new Date().toISOString(), books }, null, 2);
    const existingGistId = await getSavedGistId();

    let response: Response;

    if (existingGistId) {
      // Update existing gist
      response = await fetch(`https://api.github.com/gists/${existingGistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'book-catalog-app',
        },
        body: JSON.stringify({
          description: `Book Catalog Backup — ${new Date().toLocaleString()}`,
          files: { [GIST_FILENAME]: { content } },
        }),
      });
    } else {
      // Create new gist
      response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'book-catalog-app',
        },
        body: JSON.stringify({
          description: `Book Catalog Backup — ${new Date().toLocaleString()}`,
          public: false,
          files: { [GIST_FILENAME]: { content } },
        }),
      });
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error: ${response.status}`);
    }

    const gist = await response.json();
    await saveGistId(gist.id);

    return NextResponse.json({
      success: true,
      gistId: gist.id,
      gistUrl: gist.html_url,
      booksCount: books.length,
    });
  } catch (error) {
    console.error('Gist backup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backup failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: 'GITHUB_TOKEN environment variable is not set. Add it in Railway dashboard.' },
      { status: 500 }
    );
  }

  try {
    const existingGistId = await getSavedGistId();

    if (!existingGistId) {
      return NextResponse.json(
        { error: 'No backup found. Create a backup first using "Backup to GitHub".' },
        { status: 404 }
      );
    }

    const response = await fetch(`https://api.github.com/gists/${existingGistId}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'book-catalog-app',
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error: ${response.status}`);
    }

    const gist = await response.json();
    const fileContent = gist.files?.[GIST_FILENAME]?.content;

    if (!fileContent) {
      return NextResponse.json({ error: 'Backup file not found in Gist.' }, { status: 404 });
    }

    const parsed = JSON.parse(fileContent);
    const books: Book[] = Array.isArray(parsed) ? parsed : parsed.books;

    return NextResponse.json({
      books,
      savedAt: parsed.savedAt ?? null,
      gistUrl: gist.html_url,
    });
  } catch (error) {
    console.error('Gist restore error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Restore failed' },
      { status: 500 }
    );
  }
}
