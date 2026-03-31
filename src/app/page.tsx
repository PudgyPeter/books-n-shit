'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Book, BookFormData } from '@/types/book';
import BookForm from '@/components/BookForm';
import BookList from '@/components/BookList';
import SearchBar from '@/components/SearchBar';
import { BookOpenIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const LS_KEY = 'book-catalog-backup';

function saveToLocalStorage(books: Book[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ books, savedAt: new Date().toISOString() }));
  } catch {}
}

function loadFromLocalStorage(): { books: Book[]; savedAt: string } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'all' | 'title' | 'author'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restorePrompt, setRestorePrompt] = useState<{ books: Book[]; savedAt: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // Load books from API on mount
  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/books', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch books');
      const data = await response.json();
      if (data.length > 0) {
        saveToLocalStorage(data);
        setBooks(data);
      } else {
        // Server returned empty - check if we have a local backup
        const local = loadFromLocalStorage();
        if (local && local.books.length > 0) {
          setRestorePrompt(local);
        }
        setBooks(data);
      }
    } catch (err) {
      setError('Failed to load books. Please try again.');
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique authors for autocomplete
  const uniqueAuthors = useMemo(() => {
    const authors = books.map((book) => book.author);
    return Array.from(new Set(authors)).sort();
  }, [books]);

  // Filter books based on search
  const filteredBooks = useMemo(() => {
    if (!searchTerm) return books;

    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return books.filter((book) => {
      switch (searchBy) {
        case 'title':
          return book.title.toLowerCase().includes(lowerSearchTerm);
        case 'author':
          return book.author.toLowerCase().includes(lowerSearchTerm);
        case 'all':
        default:
          return (
            book.title.toLowerCase().includes(lowerSearchTerm) ||
            book.author.toLowerCase().includes(lowerSearchTerm) ||
            book.coverStyle.toLowerCase().includes(lowerSearchTerm)
          );
      }
    });
  }, [books, searchTerm, searchBy]);

  const handleAddBook = async (data: BookFormData) => {
    try {
      const newBook: Book = {
        id: Date.now().toString(),
        ...data,
        dateAdded: new Date().toISOString(),
      };
      
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook),
      });
      
      if (!response.ok) throw new Error('Failed to add book');
      
      await fetchBooks();
    } catch (err) {
      setError('Failed to add book. Please try again.');
      console.error('Error adding book:', err);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      try {
        const response = await fetch(`/api/books?id=${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Failed to delete book');
        
        await fetchBooks();
      } catch (err) {
        setError('Failed to delete book. Please try again.');
        console.error('Error deleting book:', err);
      }
    }
  };

  const handleRestoreFromLocal = async (books: Book[]) => {
    setRestorePrompt(null);
    try {
      const response = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books }),
      });
      if (!response.ok) throw new Error('Restore failed');
      await fetchBooks();
    } catch (err) {
      setError('Failed to restore from local backup.');
      console.error(err);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(books, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `book-catalog-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported: Book[] = JSON.parse(text);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      const response = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: imported }),
      });
      if (!response.ok) throw new Error('Import failed');
      await fetchBooks();
    } catch (err) {
      setError('Failed to import. Make sure the file is a valid book catalog JSON.');
      console.error(err);
    }
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your book catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpenIcon className="w-12 h-12 text-blue-600" />
            <h1 className="text-5xl font-bold text-gray-900">My Book Catalog</h1>
          </div>
          <p className="text-lg text-gray-600">
            Keep track of your personal book collection
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={handleExport}
              disabled={books.length === 0}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export backup
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Import backup
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>

        {/* Restore from local backup prompt */}
        {restorePrompt && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-4 rounded-lg mb-6">
            <p className="font-semibold mb-1">⚠️ Server catalogue is empty, but a local backup was found!</p>
            <p className="text-sm mb-3">Local backup from {new Date(restorePrompt.savedAt).toLocaleString()} contains <strong>{restorePrompt.books.length} books</strong>.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRestoreFromLocal(restorePrompt.books)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Restore {restorePrompt.books.length} books to server
              </button>
              <button
                onClick={() => setRestorePrompt(null)}
                className="bg-white border border-amber-300 text-amber-800 px-4 py-2 rounded-lg text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Add Book Form */}
        <BookForm onSubmit={handleAddBook} authors={uniqueAuthors} />

        {/* Search Bar */}
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchBy={searchBy}
          onSearchByChange={setSearchBy}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total Books</p>
            <p className="text-3xl font-bold text-blue-600">{books.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Unique Authors</p>
            <p className="text-3xl font-bold text-purple-600">{uniqueAuthors.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Search Results</p>
            <p className="text-3xl font-bold text-indigo-600">{filteredBooks.length}</p>
          </div>
        </div>

        {/* Book List */}
        <BookList books={filteredBooks} onDelete={handleDeleteBook} />
      </div>
    </div>
  );
}
