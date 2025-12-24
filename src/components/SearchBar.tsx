'use client';

import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchBy: 'all' | 'title' | 'author';
  onSearchByChange: (value: 'all' | 'title' | 'author') => void;
}

export default function SearchBar({
  searchTerm,
  onSearchChange,
  searchBy,
  onSearchByChange,
}: SearchBarProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search your book catalog..."
            className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onSearchByChange('all')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              searchBy === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onSearchByChange('title')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              searchBy === 'title'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Title
          </button>
          <button
            onClick={() => onSearchByChange('author')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              searchBy === 'author'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Author
          </button>
        </div>
      </div>
      
      {searchTerm && (
        <div className="mt-3 text-sm text-gray-600">
          Searching {searchBy === 'all' ? 'all fields' : searchBy}
        </div>
      )}
    </div>
  );
}
