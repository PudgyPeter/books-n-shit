export type CoverStyle = 'Hardback' | 'Softback' | 'Paperback' | 'Mass Market Paperback' | 'Leather Bound' | 'Board Book';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverStyle: CoverStyle;
  dateAdded: string;
  isbn?: string;
}

export interface BookFormData {
  title: string;
  author: string;
  coverStyle: CoverStyle;
  isbn?: string;
}
