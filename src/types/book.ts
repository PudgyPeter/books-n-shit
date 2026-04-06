export interface Book {
  id: string;
  title: string;
  author: string;
  dateAdded: string;
  isbn?: string;
}

export interface BookFormData {
  title: string;
  author: string;
  isbn?: string;
}
