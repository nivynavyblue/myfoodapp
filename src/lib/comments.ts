import { supabase } from "./supabaseClient";
import { fetchProfiles } from "./groups";
import {
  COMMENT_MAX,
  type CommentSort,
  type CommentVote,
  type RestaurantComment,
} from "@/types/comment";

/** restaurant id -> number of comments, for every restaurant the caller can see. */
export async function fetchCommentCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("restaurant_comment_counts")
    .select("restaurant_id, comment_count");
  if (error) throw error;
  return new Map(
    (data as { restaurant_id: string; comment_count: number }[]).map((r) => [
      r.restaurant_id,
      r.comment_count,
    ]),
  );
}

export async function fetchComments(
  restaurantId: string,
): Promise<RestaurantComment[]> {
  const { data, error } = await supabase
    .from("restaurant_comments")
    .select("id, restaurant_id, user_id, body, created_at, comment_votes(user_id, value)")
    .eq("restaurant_id", restaurantId);
  if (error) throw error;

  const rows = data as unknown as (Omit<RestaurantComment, "votes" | "author"> & {
    comment_votes: CommentVote[];
  })[];
  const profiles = await fetchProfiles([...new Set(rows.map((r) => r.user_id))]);

  return rows.map(({ comment_votes, ...c }) => ({
    ...c,
    votes: comment_votes,
    author: profiles.get(c.user_id),
  }));
}

export async function addComment(
  restaurantId: string,
  body: string,
): Promise<void> {
  const text = body.trim();
  if (text.length === 0 || text.length > COMMENT_MAX) {
    throw new Error(`O comentário deve ter de 1 a ${COMMENT_MAX} caracteres.`);
  }
  const { error } = await supabase
    .from("restaurant_comments")
    .insert({ restaurant_id: restaurantId, body: text });
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase
    .from("restaurant_comments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Sets my vote on a comment; `null` removes it. */
export async function setVote(
  commentId: string,
  userId: string,
  value: 1 | -1 | null,
): Promise<void> {
  if (value === null) {
    const { error } = await supabase
      .from("comment_votes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("comment_votes")
    .upsert(
      { comment_id: commentId, user_id: userId, value },
      { onConflict: "comment_id,user_id" },
    );
  if (error) throw error;
}

export function voteScore(c: RestaurantComment): number {
  return c.votes.reduce((sum, v) => sum + v.value, 0);
}

export function sortComments(
  comments: RestaurantComment[],
  sort: CommentSort,
): RestaurantComment[] {
  const time = (c: RestaurantComment) => Date.parse(c.created_at);
  const list = [...comments];
  switch (sort) {
    case "oldest":
      return list.sort((a, b) => time(a) - time(b));
    case "newest":
      return list.sort((a, b) => time(b) - time(a));
    case "likes":
      return list.sort((a, b) => voteScore(b) - voteScore(a) || time(b) - time(a));
  }
}
