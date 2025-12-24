import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get('isbn');
    
    if (!isbn) {
      return NextResponse.json({ error: 'ISBN is required' }, { status: 400 });
    }

    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
    
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`,
      { cache: 'no-store' }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch book data');
    }
    
    const data = await response.json();
    const bookKey = `ISBN:${cleanIsbn}`;
    const bookData = data[bookKey];
    
    if (!bookData) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const authors = bookData.authors?.map((author: any) => author.name).join(', ') || '';
    
    return NextResponse.json({
      title: bookData.title || '',
      author: authors,
      isbn: cleanIsbn,
    });
  } catch (error) {
    console.error('Error fetching ISBN data:', error);
    return NextResponse.json({ error: 'Failed to fetch book data' }, { status: 500 });
  }
}
