'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Book, BookFormData } from '@/types/book';
import BookForm from '@/components/BookForm';
import BookList from '@/components/BookList';
import { PlusIcon, MagnifyingGlassIcon, XMarkIcon, CloudArrowUpIcon, CloudArrowDownIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

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
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [restorePrompt, setRestorePrompt] = useState<{ books: Book[]; savedAt: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [gistStatus, setGistStatus] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/books', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error('Failed to fetch books');
      const data = await response.json();
      if (data.length > 0) {
        saveToLocalStorage(data);
        setBooks(data);
      } else {
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

  const uniqueAuthors = useMemo(() => {
    const authors = books.map((book) => book.author);
    return Array.from(new Set(authors)).sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return books;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return books.filter((book) => {
      switch (searchBy) {
        case 'title': return book.title.toLowerCase().includes(lowerSearchTerm);
        case 'author': return book.author.toLowerCase().includes(lowerSearchTerm);
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
      setShowModal(false);
      await fetchBooks();
      setToast({ msg: 'Book added!', type: 'success' });
    } catch (err) {
      setError('Failed to add book. Please try again.');
      console.error('Error adding book:', err);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      try {
        const response = await fetch(`/api/books?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete book');
        await fetchBooks();
        setToast({ msg: 'Book deleted.', type: 'success' });
      } catch (err) {
        setError('Failed to delete book. Please try again.');
        console.error('Error deleting book:', err);
      }
    }
  };

  const handleRestoreFromLocal = async (booksToRestore: Book[]) => {
    setRestorePrompt(null);
    try {
      const response = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: booksToRestore }),
      });
      if (!response.ok) throw new Error('Restore failed');
      await fetchBooks();
      setToast({ msg: 'Restored from local backup!', type: 'success' });
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
    setShowMenu(false);
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
      setToast({ msg: 'Imported successfully!', type: 'success' });
    } catch (err) {
      setToast({ msg: 'Import failed. Invalid file.', type: 'error' });
      console.error(err);
    }
    e.target.value = '';
    setShowMenu(false);
  };

  const handleGistBackup = async () => {
    setGistStatus('Backing up...');
    setShowMenu(false);
    try {
      const response = await fetch('/api/backup/gist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Backup failed');
      setGistStatus(null);
      setToast({ msg: `Backed up to GitHub Gist (${books.length} books)`, type: 'success' });
    } catch (err: any) {
      setGistStatus(null);
      setToast({ msg: err.message || 'GitHub backup failed', type: 'error' });
    }
  };

  const handleGistRestore = async () => {
    setGistStatus('Restoring...');
    setShowMenu(false);
    try {
      const response = await fetch('/api/backup/gist');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Restore failed');
      const restoreResponse = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: data.books }),
      });
      if (!restoreResponse.ok) throw new Error('Restore failed');
      await fetchBooks();
      setGistStatus(null);
      setToast({ msg: `Restored ${data.books.length} books from GitHub Gist`, type: 'success' });
    } catch (err: any) {
      setGistStatus(null);
      setToast({ msg: err.message || 'GitHub restore failed', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-zinc-500 text-sm">Loading catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-24">

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-zinc-50/90 backdrop-blur border-b border-zinc-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <h1 className="text-base font-semibold shrink-0">📚 My Catalog</h1>

          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-sm">
            <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full outline-none bg-transparent text-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}>
                <XMarkIcon className="w-4 h-4 text-zinc-400" />
              </button>
            )}
          </div>

          {/* Menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-zinc-200 shadow-sm text-zinc-600 hover:bg-zinc-50 active:scale-95 transition"
            >
              <span className="text-lg leading-none">⋮</span>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-zinc-100 py-1 z-30">
                <button onClick={handleGistBackup} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100">
                  <CloudArrowUpIcon className="w-4 h-4 text-blue-500" />
                  Backup to GitHub
                </button>
                <button onClick={handleGistRestore} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100">
                  <CloudArrowDownIcon className="w-4 h-4 text-green-500" />
                  Restore from GitHub
                </button>
                <div className="border-t border-zinc-100 my-1" />
                <button onClick={handleExport} disabled={books.length === 0} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-40">
                  <ArrowDownTrayIcon className="w-4 h-4 text-zinc-400" />
                  Export JSON
                </button>
                <button onClick={() => { importRef.current?.click(); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100">
                  <ArrowUpTrayIcon className="w-4 h-4 text-zinc-400" />
                  Import JSON
                </button>
                <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              </div>
            )}
          </div>
        </div>

        {/* Search filter pills */}
        <div className="max-w-2xl mx-auto px-4 pb-2 flex gap-2">
          {(['all', 'title', 'author'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setSearchBy(opt)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                searchBy === opt
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
          {searchTerm && (
            <span className="text-xs text-zinc-400 self-center ml-1">{filteredBooks.length} result{filteredBooks.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Status bar for gist ops */}
      {gistStatus && (
        <div className="max-w-2xl mx-auto px-4 mt-3">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            {gistStatus}
          </div>
        </div>
      )}

      {/* Restore from local backup prompt */}
      {restorePrompt && (
        <div className="max-w-2xl mx-auto px-4 mt-3">
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl">
            <p className="font-semibold text-sm mb-1">⚠️ Server is empty — local backup found</p>
            <p className="text-xs mb-3 text-amber-700">
              {new Date(restorePrompt.savedAt).toLocaleString()} · {restorePrompt.books.length} books
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleRestoreFromLocal(restorePrompt.books)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
              >
                Restore {restorePrompt.books.length} books
              </button>
              <button
                onClick={() => setRestorePrompt(null)}
                className="bg-white border border-amber-300 text-amber-800 px-3 py-1.5 rounded-lg text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto px-4 mt-3">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm flex justify-between items-center">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-2xl mx-auto px-4 mt-4 grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{books.length}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Books</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-purple-600">{uniqueAuthors.length}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Authors</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-indigo-600">{filteredBooks.length}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Showing</p>
        </div>
      </div>

      {/* Book Grid */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <BookList books={filteredBooks} onDelete={handleDeleteBook} />
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 z-20 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-90 hover:bg-blue-700 transition"
        aria-label="Add book"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Add Book Modal (bottom sheet on mobile) */}
      {showModal && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100">
              <h2 className="text-base font-semibold">Add Book</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4">
              <BookForm onSubmit={handleAddBook} authors={uniqueAuthors} />
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition ${
          toast.type === 'success' ? 'bg-zinc-900 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
