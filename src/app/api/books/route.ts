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

async function readBooks(): Promise<Book[]> {
  try {
    await ensureDataDir();
    console.log(`Reading books from: ${BOOKS_FILE}`);
    const data = await fs.readFile(BOOKS_FILE, 'utf-8');
    const books = JSON.parse(data);
    console.log(`Successfully read ${books.length} books`);
    return books;
  } catch (error) {
    console.error('Error reading books:', error);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Books file path: ${BOOKS_FILE}`);
    
    // Try to check if volume exists but file is missing
    try {
      await fs.access(DATA_DIR);
      console.log('Data directory exists but books file is missing');
      
      // Check for backup files or other data
      try {
        const files = await fs.readdir(DATA_DIR);
        console.log('Files in data directory:', files);
      } catch (dirError) {
        console.error('Cannot list data directory:', dirError);
      }
    } catch {
      console.log('Data directory does not exist');
    }
    
    return [];
  }
}

async function writeBooks(books: Book[]): Promise<void> {
  await ensureDataDir();
  console.log(`Writing ${books.length} books to: ${BOOKS_FILE}`);
  await fs.writeFile(BOOKS_FILE, JSON.stringify(books, null, 2), 'utf-8');
  console.log('Successfully wrote books file');
}

export async function GET() {
  try {
    const books = await readBooks();
    return NextResponse.json(books, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error reading books:', error);
    return NextResponse.json({ error: 'Failed to read books' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const newBook: Book = await request.json();
    const books = await readBooks();
    books.unshift(newBook);
    await writeBooks(books);
    return NextResponse.json(newBook, { 
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error adding book:', error);
    return NextResponse.json({ error: 'Failed to add book' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const books = await readBooks();
    const filteredBooks = books.filter((book) => book.id !== id);
    
    if (books.length === filteredBooks.length) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    await writeBooks(filteredBooks);
    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
