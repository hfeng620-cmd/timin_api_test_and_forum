"use client";

import {
  fetchApprovedPosts,
  fetchPendingPosts,
  fetchComments,
  createPost,
  addComment,
  toggleLike,
  approvePost,
  rejectPost,
  type GithubPost,
  type GithubComment,
  type CreatePostInput,
} from "./github-api";

export type DiscussionPost = GithubPost;
export type DiscussionReply = GithubComment;

export async function loadDiscussionPosts(
  token?: string,
): Promise<DiscussionPost[]> {
  return fetchApprovedPosts(token);
}

export async function loadPendingDiscussionPosts(
  token: string,
): Promise<DiscussionPost[]> {
  return fetchPendingPosts(token);
}

export async function approveDiscussionPost(
  token: string,
  issueNumber: number,
): Promise<void> {
  return approvePost(token, issueNumber);
}

export async function rejectDiscussionPost(
  token: string,
  issueNumber: number,
): Promise<void> {
  return rejectPost(token, issueNumber);
}

export async function createDiscussionPost(
  token: string,
  input: CreatePostInput,
): Promise<DiscussionPost> {
  return createPost(token, input);
}

export async function replyDiscussionPost(
  token: string,
  issueNumber: number,
  body: string,
): Promise<GithubComment> {
  return addComment(token, issueNumber, body);
}

export async function likeDiscussionPost(
  token: string,
  issueNumber: number,
  currentLikes: number,
): Promise<number> {
  return toggleLike(token, issueNumber, currentLikes);
}

export async function loadComments(
  token: string | undefined,
  issueNumber: number,
): Promise<GithubComment[]> {
  return fetchComments(token, issueNumber);
}
