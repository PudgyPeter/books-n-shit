import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Book } from '@/types/book';

const DATA_DIR = process.env.DATA_PATH || path.join(process.cwd(), 'data');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { books } = await request.json();
    
    if (!Array.isArray(books)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    await ensureDataDir();
    
    // Create backup of existing file if it exists
    try {
      await fs.access(BOOKS_FILE);
      const backupFile = BOOKS_FILE + '.backup.' + Date.now();
      await fs.copyFile(BOOKS_FILE, backupFile);
      console.log(`Created backup: ${backupFile}`);
    } catch {
      // No existing file to backup
    }

    // Write the recovered data
    await fs.writeFile(BOOKS_FILE, JSON.stringify(books, null, 2), 'utf-8');
    
    console.log(`Recovered ${books.length} books to ${BOOKS_FILE}`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully recovered ${books.length} books`,
      booksRecovered: books.length
    });
  } catch (error) {
    console.error('Error recovering books:', error);
    return NextResponse.json({ 
      error: 'Failed to recover books',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Try to find any existing data files
    const recoveryInfo = {
      dataDir: DATA_DIR,
      booksFile: BOOKS_FILE,
      backupFiles: [] as string[],
      canRecover: false
    };

    try {
      await fs.access(DATA_DIR);
      const files = await fs.readdir(DATA_DIR);
      
      // Look for backup files
      recoveryInfo.backupFiles = files.filter(file => 
        file.includes('books') && (file.includes('.backup.') || file === 'books.json')
      );
      
      if (recoveryInfo.backupFiles.length > 0) {
        recoveryInfo.canRecover = true;
      }
    } catch {
      // Data directory doesn't exist
    }

    return NextResponse.json(recoveryInfo);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check recovery options',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
