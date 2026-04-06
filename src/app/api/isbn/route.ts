import { NextRequest, NextResponse } from 'next/server';

interface BookResult {
  title: string;
  author: string;
  isbn: string;
  source: string;
  coverUrl?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

function isbn10to13(isbn10: string): string {
  const digits = isbn10.replace(/[^0-9X]/gi, '').slice(0, 9);
  const raw = '978' + digits;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(raw[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return raw + check;
}

function isbn13to10(isbn13: string): string {
  const digits = isbn13.replace(/[^0-9]/gi, '').slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  const check = (11 - (sum % 11)) % 11;
  return digits + (check === 10 ? 'X' : check.toString());
}

function getIsbnVariants(isbn: string): string[] {
  const clean = isbn.replace(/[^0-9X]/gi, '');
  const variants = new Set([clean]);
  if (clean.length === 10) variants.add(isbn10to13(clean));
  if (clean.length === 13 && clean.startsWith('978')) variants.add(isbn13to10(clean));
  return Array.from(variants);
}

async function fetchFromOpenLibrary(isbn: string): Promise<BookResult | null> {
  try {
    const response = await withTimeout(
      fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, { cache: 'no-store' }),
      5000
    );
    if (!response.ok) return null;
    const data = await response.json();
    const bookData = data[`ISBN:${isbn}`];
    if (!bookData) return null;
    const author = bookData.authors?.map((a: any) => a.name).join(', ') || '';
    if (!bookData.title && !author) return null;
    return { title: bookData.title || '', author, isbn, source: 'Open Library' };
  } catch {
    return null;
  }
}

function extractGoogleCover(info: any): string | undefined {
  const links = info.imageLinks;
  if (!links) return undefined;
  // Prefer largest available, upgrade http -> https
  const url = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
  return url ? url.replace('http://', 'https://') : undefined;
}

async function fetchFromGoogleBooks(isbn: string): Promise<BookResult | null> {
  try {
    const response = await withTimeout(
      fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`, { cache: 'no-store' }),
      5000
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.items?.length) return null;
    const info = data.items[0].volumeInfo;
    const author = info.authors?.join(', ') || '';
    if (!info.title && !author) return null;
    return { title: info.title || '', author, isbn, coverUrl: extractGoogleCover(info), source: 'Google Books' };
  } catch {
    return null;
  }
}

async function fetchFromGoogleBooksTitle(isbn: string): Promise<BookResult | null> {
  try {
    const response = await withTimeout(
      fetch(`https://www.googleapis.com/books/v1/volumes?q=${isbn}&maxResults=1`, { cache: 'no-store' }),
      5000
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.items?.length) return null;
    const info = data.items[0].volumeInfo;
    const industryIds: any[] = info.industryIdentifiers || [];
    const isbnMatch = industryIds.some((id: any) => id.identifier?.replace(/-/g, '') === isbn);
    if (!isbnMatch && industryIds.length > 0) return null;
    const author = info.authors?.join(', ') || '';
    if (!info.title) return null;
    return { title: info.title, author, isbn, coverUrl: extractGoogleCover(info), source: 'Google Books' };
  } catch {
    return null;
  }
}

async function fetchFromOpenLibrarySearch(isbn: string): Promise<BookResult | null> {
  try {
    const response = await withTimeout(
      fetch(`https://openlibrary.org/search.json?isbn=${isbn}&limit=1`, { cache: 'no-store' }),
      5000
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.docs?.length) return null;
    const doc = data.docs[0];
    const title = doc.title || '';
    const author = doc.author_name?.join(', ') || '';
    if (!title) return null;
    return { title, author, isbn, source: 'Open Library Search' };
  } catch {
    return null;
  }
}

async function fetchFromWorldCat(isbn: string): Promise<BookResult | null> {
  try {
    const response = await withTimeout(
      fetch(`https://www.worldcat.org/isbn/${isbn}`, {
        cache: 'no-store',
        headers: { 'Accept': 'text/html,application/xhtml+xml' }
      }),
      6000
    );
    if (!response.ok) return null;

    const html = await response.text();
    // Try JSON-LD first
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      const title = jsonLd.name || jsonLd.title || '';
      const authorRaw = jsonLd.author;
      const author = Array.isArray(authorRaw)
        ? authorRaw.map((a: any) => a.name || a).join(', ')
        : (authorRaw?.name || authorRaw || '');
      if (title) return { title, author, isbn, source: 'WorldCat' };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchFromGoogleBooksLoose(isbn: string): Promise<BookResult | null> {
  try {
    const response = await withTimeout(
      fetch(`https://www.googleapis.com/books/v1/volumes?q=${isbn}&maxResults=3`, { cache: 'no-store' }),
      5000
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.items?.length) return null;
    for (const item of data.items) {
      const info = item.volumeInfo;
      const title = info.title || '';
      const author = info.authors?.join(', ') || '';
      if (title && author) {
        return { title, author, isbn, coverUrl: extractGoogleCover(info), source: 'Google Books' };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function tryAllSources(isbn: string): Promise<BookResult | null> {
  // Run all sources simultaneously, return first non-null result
  const results = await Promise.allSettled([
    fetchFromOpenLibrary(isbn),
    fetchFromOpenLibrarySearch(isbn),
    fetchFromGoogleBooks(isbn),
    fetchFromGoogleBooksTitle(isbn),
    fetchFromWorldCat(isbn),
    fetchFromGoogleBooksLoose(isbn),
  ]);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get('isbn');

    if (!isbn) {
      return NextResponse.json({ error: 'ISBN is required' }, { status: 400 });
    }

    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
    const variants = getIsbnVariants(cleanIsbn);

    // Try all variants across all sources simultaneously
    const allAttempts = variants.map(v => tryAllSources(v));
    const allResults = await Promise.allSettled(allAttempts);

    let bookData: BookResult | null = null;
    for (const result of allResults) {
      if (result.status === 'fulfilled' && result.value) {
        bookData = result.value;
        break;
      }
    }

    if (!bookData) {
      console.log(`Book not found for ISBN: ${cleanIsbn} (tried variants: ${variants.join(', ')})`);
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    console.log(`Book found via ${bookData.source}: ${bookData.title}`);

    return NextResponse.json({
      title: bookData.title,
      author: bookData.author,
      isbn: bookData.isbn,
      coverUrl: bookData.coverUrl,
    });
  } catch (error) {
    console.error('Error fetching ISBN data:', error);
    return NextResponse.json({ error: 'Failed to fetch book data' }, { status: 500 });
  }
}
