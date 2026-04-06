'use client';

import { Book } from '@/types/book';
import { TrashIcon } from '@heroicons/react/24/outline';

interface BookListProps {
  books: Book[];
  onDelete: (id: string) => void;
}

const gradients = [
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-500',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-600',
];

function getGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

export default function BookList({ books, onDelete }: BookListProps) {
  if (books.length === 0) {
    return (
      <div className="text-center mt-16 text-zinc-400 px-4">
        <p className="text-4xl mb-3">📚</p>
        <p className="text-base font-medium text-zinc-500">No books yet</p>
        <p className="text-sm mt-1">Tap + to add your first book</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {books.map((book) => (
        <div
          key={book.id}
          className="bg-white rounded-2xl shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
        >
          {/* Cover */}
          <div className={`h-28 relative overflow-hidden ${!book.coverUrl ? `bg-gradient-to-br ${getGradient(book.id)}` : 'bg-zinc-100'} flex items-center justify-center`}>
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <span className="text-white text-3xl font-bold drop-shadow">
                {book.title[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="p-3">
            <h2 className="font-semibold text-sm leading-tight line-clamp-2 text-zinc-900">{book.title}</h2>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{book.author}</p>

            <div className="mt-2 flex items-center justify-end gap-1">
              <button
                onClick={() => onDelete(book.id)}
                className="text-red-400 hover:text-red-600 active:scale-90 transition p-1 rounded-lg hover:bg-red-50"
                title="Delete book"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
