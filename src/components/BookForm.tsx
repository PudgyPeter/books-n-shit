'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { BookFormData } from '@/types/book';
import { PlusIcon, CameraIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false });

interface BookFormProps {
  onSubmit: (data: BookFormData) => void;
  authors: string[];
  defaultIsbn?: string;
  isbnNotFound?: boolean;
}

export default function BookForm({ onSubmit, authors, defaultIsbn, isbnNotFound }: BookFormProps) {
  const { register, handleSubmit, reset, watch, setValue } = useForm<BookFormData>({
    defaultValues: { isbn: defaultIsbn ?? '' },
  });
  const [authorSuggestion, setAuthorSuggestion] = useState<string>('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isLoadingIsbn, setIsLoadingIsbn] = useState(false);
  const [isbnError, setIsbnError] = useState<string | null>(isbnNotFound ? 'ISBN not found — enter title and author manually.' : null);
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  
  const authorInput = watch('author');

  useEffect(() => {
    if (authorInput && authorInput.length > 0) {
      const matchingAuthor = authors.find(
        (author) => author.toLowerCase().startsWith(authorInput.toLowerCase()) && author.toLowerCase() !== authorInput.toLowerCase()
      );
      
      if (matchingAuthor) {
        setAuthorSuggestion(matchingAuthor);
        setShowSuggestion(true);
      } else {
        setShowSuggestion(false);
      }
    } else {
      setShowSuggestion(false);
    }
  }, [authorInput, authors]);

  const handleFormSubmit = (data: BookFormData) => {
    onSubmit({ ...data, coverUrl });
    reset();
    setCoverUrl(undefined);
    setShowSuggestion(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && showSuggestion) {
      e.preventDefault();
      setValue('author', authorSuggestion);
      setShowSuggestion(false);
    }
  };

  const fetchBookDataFromIsbn = async (isbn: string) => {
    setIsLoadingIsbn(true);
    setIsbnError(null);
    
    try {
      const response = await fetch(`/api/isbn?isbn=${isbn}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Book not found in Open Library. You can still enter details manually.');
      }
      
      const data = await response.json();
      
      if (data.title) setValue('title', data.title);
      if (data.author) setValue('author', data.author);
      if (data.isbn) setValue('isbn', data.isbn);
      if (data.coverUrl) { setValue('coverUrl', data.coverUrl); setCoverUrl(data.coverUrl); }
    } catch (err: any) {
      setIsbnError(err.message || 'Book not found. ISBN saved - enter title and author manually.');
    } finally {
      setIsLoadingIsbn(false);
    }
  };

  const handleBarcodeScan = (isbn: string) => {
    setValue('isbn', isbn);
    fetchBookDataFromIsbn(isbn);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-3">
      <div>
        <label htmlFor="title" className="block text-xs font-medium text-zinc-600 mb-1">
          Title
        </label>
        <input
          id="title"
          type="text"
          {...register('title', { required: true })}
          className="w-full px-3 py-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="Book title"
          required
        />
      </div>

      <div className="relative">
        <label htmlFor="author" className="block text-xs font-medium text-zinc-600 mb-1">
          Author
        </label>
        <div className="relative">
          <input
            id="author"
            type="text"
            {...register('author', { required: true })}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all relative z-10 bg-transparent"
            placeholder="Author name"
            autoComplete="off"
            required
          />
          {showSuggestion && (
            <div className="absolute inset-0 px-3 py-3 pointer-events-none text-sm">
              <span className="text-transparent">{authorInput}</span>
              <span className="text-zinc-400">{authorSuggestion.slice(authorInput.length)}</span>
            </div>
          )}
        </div>
        {showSuggestion && (
          <p className="text-xs text-zinc-400 mt-1">Press Tab to autocomplete</p>
        )}
      </div>

      <div>
        <label htmlFor="isbn" className="block text-xs font-medium text-zinc-600 mb-1">
          ISBN <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <div className="flex gap-2">
          <input
            id="isbn"
            type="text"
            {...register('isbn')}
            className="flex-1 min-w-0 px-3 py-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Enter or scan ISBN"
          />
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex-shrink-0 px-3 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 transition-all flex items-center gap-1.5 text-sm"
            title="Scan barcode"
          >
            <CameraIcon className="w-4 h-4" />
            <span>Scan</span>
          </button>
        </div>
        {isLoadingIsbn && <p className="text-xs text-blue-600 mt-1">Loading book data...</p>}
        {isbnError && <p className="text-xs text-red-500 mt-1">{isbnError}</p>}
      </div>

      <button
        type="submit"
        className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm mt-1"
      >
        <PlusIcon className="w-4 h-4" />
        Add Book
      </button>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </form>
  );
}
