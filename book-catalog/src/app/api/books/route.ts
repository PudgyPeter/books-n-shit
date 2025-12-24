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
    const data = await fs.readFile(BOOKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeBooks(books: Book[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(BOOKS_FILE, JSON.stringify(books, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const books = await readBooks();
    return NextResponse.json(books);
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
    return NextResponse.json(newBook, { status: 201 });
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
