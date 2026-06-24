const OWNER = "hfeng620-cmd";
const REPO = "timin_api_test_and_forum";
const BASE_URL = "https://api.github.com";
const DISCUSSION_LABEL = "讨论";
const PENDING_LABEL = "待审核";
const APPROVED_LABEL = "已通过";

export type GithubPost = {
  issueNumber: number;
  author: string;
  handle: string;
  postedAt: string;
  body: string;
  tags: string[];
  station?: string;
  likes: number;
  replyCount: number;
};

export type GithubComment = {
  id: number;
  author: string;
  avatar: string;
  postedAt: string;
  body: string;
};

export type CreatePostInput = {
  author: string;
  handle: string;
  body: string;
  station?: string;
  tags?: string[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function issueToPost(issue: Record<string, unknown>): GithubPost | null {
  try {
    const bodyStr = typeof issue.body === "string" ? issue.body : "";
    const parsed = JSON.parse(bodyStr);
    return {
      issueNumber: issue.number as number,
      author: parsed.author ?? "",
      handle: parsed.handle ?? "",
      postedAt: parsed.postedAt ?? (issue.created_at as string) ?? "",
      body: parsed.body ?? "",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      station: parsed.station || undefined,
      likes: (() => {
        const reactions = issue.reactions as Record<string, unknown> | undefined;
        const thumbsUp = reactions?.["+1"];
        return typeof thumbsUp === "number"
          ? thumbsUp
          : typeof parsed.likes === "number"
            ? parsed.likes
            : 0;
      })(),
      replyCount: typeof issue.comments === "number" ? issue.comments : 0,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchApprovedPosts(token?: string): Promise<GithubPost[]> {
  try {
    const url = `${BASE_URL}/repos/${OWNER}/${REPO}/issues?labels=${encodeURIComponent(`${APPROVED_LABEL},${DISCUSSION_LABEL}`)}&state=open&per_page=50`;
    const res = await fetch(url, { headers: buildHeaders(token) });
    if (!res.ok) return [];

    const issues = (await res.json()) as Record<string, unknown>[];
    const posts = issues
      .map(issueToPost)
      .filter((p): p is GithubPost => p !== null);

    posts.sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );
    return posts;
  } catch {
    return [];
  }
}

export async function fetchPendingPosts(token: string): Promise<GithubPost[]> {
  try {
    const url = `${BASE_URL}/repos/${OWNER}/${REPO}/issues?labels=${encodeURIComponent(PENDING_LABEL)}&state=open&per_page=50`;
    const res = await fetch(url, { headers: buildHeaders(token) });
    if (!res.ok) return [];

    const issues = (await res.json()) as Record<string, unknown>[];
    const posts = issues
      .map(issueToPost)
      .filter((p): p is GithubPost => p !== null);

    posts.sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );
    return posts;
  } catch {
    return [];
  }
}

export async function createPost(
  token: string,
  input: CreatePostInput
): Promise<GithubPost> {
  const payload = {
    author: input.author || "匿名",
    handle: input.handle || "@anon",
    body: input.body,
    station: input.station || "",
    tags: input.tags || [],
    likes: 0,
    postedAt: new Date().toISOString(),
  };

  const title =
    input.body.length > 60 ? input.body.slice(0, 60) : input.body || "新讨论";

  const res = await fetch(`${BASE_URL}/repos/${OWNER}/${REPO}/issues`, {
    method: "POST",
    headers: {
      ...buildHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      body: JSON.stringify(payload),
      labels: [DISCUSSION_LABEL, PENDING_LABEL],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create post: ${res.status} ${text}`);
  }

  const issue = (await res.json()) as Record<string, unknown>;
  const post = issueToPost(issue);
  if (!post) throw new Error("Failed to parse created issue");
  return post;
}

export async function fetchComments(
  token: string | undefined,
  issueNumber: number
): Promise<GithubComment[]> {
  try {
    const url = `${BASE_URL}/repos/${OWNER}/${REPO}/issues/${issueNumber}/comments?per_page=100`;
    const res = await fetch(url, { headers: buildHeaders(token) });
    if (!res.ok) return [];

    const comments = (await res.json()) as Record<string, unknown>[];
    return comments.map(
      (c): GithubComment => ({
        id: c.id as number,
        author:
          (c.user as Record<string, unknown> | undefined)?.login as string ??
          "",
        avatar:
          (c.user as Record<string, unknown> | undefined)
            ?.avatar_url as string ?? "",
        postedAt: (c.created_at as string) ?? "",
        body: (c.body as string) ?? "",
      })
    );
  } catch {
    return [];
  }
}

export async function addComment(
  token: string,
  issueNumber: number,
  body: string
): Promise<GithubComment> {
  const res = await fetch(
    `${BASE_URL}/repos/${OWNER}/${REPO}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        ...buildHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to add comment: ${res.status} ${text}`);
  }

  const c = (await res.json()) as Record<string, unknown>;
  return {
    id: c.id as number,
    author:
      (c.user as Record<string, unknown> | undefined)?.login as string ?? "",
    avatar:
      (c.user as Record<string, unknown> | undefined)
        ?.avatar_url as string ?? "",
    postedAt: (c.created_at as string) ?? "",
    body: (c.body as string) ?? "",
  };
}

export async function toggleLike(
  token: string,
  issueNumber: number,
  currentLikes: number
): Promise<number> {
  try {
    const res = await fetch(
      `${BASE_URL}/repos/${OWNER}/${REPO}/issues/${issueNumber}/reactions`,
      {
        method: "POST",
        headers: {
          ...buildHeaders(token),
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: "+1" }),
      },
    );

    if (res.status === 201) {
      return currentLikes + 1;
    }
    return currentLikes;
  } catch {
    return currentLikes;
  }
}

export async function approvePost(
  token: string,
  issueNumber: number,
): Promise<void> {
  const labelsRes = await fetch(
    `${BASE_URL}/repos/${OWNER}/${REPO}/issues/${issueNumber}/labels`,
    {
      method: "POST",
      headers: {
        ...buildHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ labels: [DISCUSSION_LABEL, APPROVED_LABEL] }),
    },
  );

  if (!labelsRes.ok) {
    const text = await labelsRes.text();
    throw new Error(`Failed to approve post: ${labelsRes.status} ${text}`);
  }

  const removeRes = await fetch(
    `${BASE_URL}/repos/${OWNER}/${REPO}/issues/${issueNumber}/labels/${encodeURIComponent(PENDING_LABEL)}`,
    {
      method: "DELETE",
      headers: buildHeaders(token),
    },
  );

  if (!removeRes.ok && removeRes.status !== 404) {
    const text = await removeRes.text();
    throw new Error(`Failed to remove pending label: ${removeRes.status} ${text}`);
  }
}

export async function rejectPost(
  token: string,
  issueNumber: number,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/repos/${OWNER}/${REPO}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: {
      ...buildHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state: "closed", labels: [DISCUSSION_LABEL, PENDING_LABEL] }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to reject post: ${res.status} ${text}`);
  }
}
