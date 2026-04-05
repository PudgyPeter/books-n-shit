import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  const info: any = {
    mainPath: '/main',
    booksFile: '/main/books.json',
    mainExists: false,
    booksExists: false,
    files: [] as string[],
    bookContent: null as string | null
  };

  try {
    // Check if /main exists
    await fs.access('/main');
    info.mainExists = true;

    // List files in /main
    const files = await fs.readdir('/main');
    info.files = files;

    // Check for books.json
    try {
      await fs.access('/main/books.json');
      info.booksExists = true;
      const content = await fs.readFile('/main/books.json', 'utf-8');
      info.bookContent = content;
    } catch {
      info.booksExists = false;
    }

    // Check for any JSON files
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    info.jsonFiles = jsonFiles;

  } catch (error) {
    info.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return NextResponse.json(info);
}
