import type { Profile } from "./profile";

export const COMMENT_MAX = 200;

export type CommentSort = "likes" | "newest" | "oldest";

export interface CommentVote {
  user_id: string;
  value: 1 | -1;
}

export interface RestaurantComment {
  id: string;
  restaurant_id: string;
  user_id: string;
  body: string;
  created_at: string;
  votes: CommentVote[];
  /** Undefined when the author left the group and is no longer visible. */
  author?: Profile;
}
