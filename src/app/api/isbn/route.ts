import { NextRequest, NextResponse } from 'next/server';

async function fetchFromOpenLibrary(isbn: string) {
  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
    { cache: 'no-store' }
  );
  
  if (!response.ok) {
    return null;
  }
  
  const data = await response.json();
  const bookKey = `ISBN:${isbn}`;
  const bookData = data[bookKey];
  
  if (!bookData) {
    return null;
  }

  const authors = bookData.authors?.map((author: any) => author.name).join(', ') || '';
  
  return {
    title: bookData.title || '',
    author: authors,
    isbn: isbn,
    source: 'Open Library'
  };
}

async function fetchFromGoogleBooks(isbn: string) {
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
    { cache: 'no-store' }
  );
  
  if (!response.ok) {
    return null;
  }
  
  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    return null;
  }

  const bookData = data.items[0].volumeInfo;
  const authors = bookData.authors?.join(', ') || '';
  
  return {
    title: bookData.title || '',
    author: authors,
    isbn: isbn,
    source: 'Google Books'
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get('isbn');
    
    if (!isbn) {
      return NextResponse.json({ error: 'ISBN is required' }, { status: 400 });
    }

    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
    
    let bookData = await fetchFromOpenLibrary(cleanIsbn);
    
    if (!bookData) {
      console.log(`Book not found in Open Library, trying Google Books for ISBN: ${cleanIsbn}`);
      bookData = await fetchFromGoogleBooks(cleanIsbn);
    }
    
    if (!bookData) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    console.log(`Book found via ${bookData.source}: ${bookData.title}`);
    
    return NextResponse.json({
      title: bookData.title,
      author: bookData.author,
      isbn: bookData.isbn,
    });
  } catch (error) {
    console.error('Error fetching ISBN data:', error);
    return NextResponse.json({ error: 'Failed to fetch book data' }, { status: 500 });
  }
}
