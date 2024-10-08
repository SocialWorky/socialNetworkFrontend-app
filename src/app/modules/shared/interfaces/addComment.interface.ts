export interface CreateComment {
  content: string;
  authorId: string;
  idPublication?: string | null;
  idMedia?: string | null;
}