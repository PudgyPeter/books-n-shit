'use client';

import { useState, useEffect, useMemo } from 'react';
import { Book, BookFormData } from '@/types/book';
import BookForm from '@/components/BookForm';
import BookList from '@/components/BookList';
import SearchBar from '@/components/SearchBar';
import { BookOpenIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'all' | 'title' | 'author'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load books from API on mount
  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/books');
      if (!response.ok) throw new Error('Failed to fetch books');
      const data = await response.json();
      setBooks(data);
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
        </div>

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
