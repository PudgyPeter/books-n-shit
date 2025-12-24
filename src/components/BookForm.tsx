'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { BookFormData, CoverStyle } from '@/types/book';
import { PlusIcon, CameraIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false });

interface BookFormProps {
  onSubmit: (data: BookFormData) => void;
  authors: string[];
}

const coverStyles: CoverStyle[] = [
  'Hardback',
  'Softback',
  'Paperback',
  'Mass Market Paperback',
  'Leather Bound',
  'Board Book',
];

export default function BookForm({ onSubmit, authors }: BookFormProps) {
  const { register, handleSubmit, reset, watch, setValue } = useForm<BookFormData>();
  const [authorSuggestion, setAuthorSuggestion] = useState<string>('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isLoadingIsbn, setIsLoadingIsbn] = useState(false);
  const [isbnError, setIsbnError] = useState<string | null>(null);
  
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
    onSubmit(data);
    reset();
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="bg-white rounded-xl shadow-lg p-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Book</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Book Title
          </label>
          <input
            id="title"
            type="text"
            {...register('title', { required: true })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Enter book title"
            required
          />
        </div>

        <div className="relative">
          <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
            Author
          </label>
          <div className="relative">
            <input
              id="author"
              type="text"
              {...register('author', { required: true })}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all relative z-10 bg-transparent"
              placeholder="Enter author name"
              autoComplete="off"
              required
            />
            {showSuggestion && (
              <div className="absolute inset-0 px-4 py-3 pointer-events-none">
                <span className="text-transparent">{authorInput}</span>
                <span className="text-gray-400">{authorSuggestion.slice(authorInput.length)}</span>
              </div>
            )}
          </div>
          {showSuggestion && (
            <p className="text-xs text-gray-500 mt-1">Press Tab to autocomplete</p>
          )}
        </div>

        <div>
          <label htmlFor="isbn" className="block text-sm font-medium text-gray-700 mb-2">
            ISBN (Optional)
          </label>
          <div className="flex gap-2">
            <input
              id="isbn"
              type="text"
              {...register('isbn')}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter ISBN or scan barcode"
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 transition-all flex items-center gap-2"
              title="Scan barcode"
            >
              <CameraIcon className="w-5 h-5" />
              Scan
            </button>
          </div>
          {isLoadingIsbn && (
            <p className="text-xs text-blue-600 mt-1">Loading book data...</p>
          )}
          {isbnError && (
            <p className="text-xs text-red-600 mt-1">{isbnError}</p>
          )}
        </div>

        <div>
          <label htmlFor="coverStyle" className="block text-sm font-medium text-gray-700 mb-2">
            Cover Style
          </label>
          <select
            id="coverStyle"
            {...register('coverStyle', { required: true })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
          >
            <option value="">Select cover style</option>
            {coverStyles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all flex items-center justify-center gap-2"
      >
        <PlusIcon className="w-5 h-5" />
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
