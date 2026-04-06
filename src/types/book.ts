export interface Book {
  id: string;
  title: string;
  author: string;
  dateAdded: string;
  isbn?: string;
  coverUrl?: string;
}

export interface BookFormData {
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
}
