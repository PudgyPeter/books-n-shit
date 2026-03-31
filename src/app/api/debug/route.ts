import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_PATH || path.join(process.cwd(), 'data');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');

export async function GET() {
  const debugInfo = {
    dataDir: DATA_DIR,
    booksFile: BOOKS_FILE,
    envDataPath: process.env.DATA_PATH,
    cwd: process.cwd(),
    volumeExists: false,
    fileExists: false,
    fileContent: null as string | null,
    error: null as string | null,
    directoryFiles: null as string[] | null,
    directoryError: null as string | null
  };

  try {
    // Check if data directory exists
    try {
      await fs.access(DATA_DIR);
      debugInfo.volumeExists = true;
    } catch {
      debugInfo.volumeExists = false;
    }

    // Check if books file exists
    try {
      await fs.access(BOOKS_FILE);
      debugInfo.fileExists = true;
      
      // Read file content
      const content = await fs.readFile(BOOKS_FILE, 'utf-8');
      debugInfo.fileContent = content;
    } catch {
      debugInfo.fileExists = false;
    }

    // List directory contents if it exists
    if (debugInfo.volumeExists) {
      try {
        const files = await fs.readdir(DATA_DIR);
        debugInfo.directoryFiles = files;
      } catch (err) {
        debugInfo.directoryError = err instanceof Error ? err.message : 'Unknown error';
      }
    }

  } catch (err) {
    debugInfo.error = err instanceof Error ? err.message : 'Unknown error';
  }

  return NextResponse.json(debugInfo);
}
