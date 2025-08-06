export interface CreateComment {
  content: string;
  authorId: string;
  containsMedia?: boolean;
  idPublication?: string | null;
  idMedia?: string | null;
}
