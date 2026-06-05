import { createHash } from "node:crypto";

export type PreferenceCategory =
  | "technology"
  | "design"
  | "workflow"
  | "communication"
  | "domain"
  | "other";

export type PreferenceSentiment = "like" | "dislike" | "neutral";
export type PreferenceScope = "global" | "frontend" | "backend" | "mobile" | "desktop" | "project";

export interface UserPreference {
  id: string;
  category: PreferenceCategory;
  subject: string;
  sentiment: PreferenceSentiment;
  strength: number;
  confidence: number;
  scope: PreferenceScope;
  sourceStatement: string;
  evidenceCount: number;
  firstSeen: string;
  lastSeen: string;
}

interface PreferenceSignal {
  pattern: RegExp;
  sentiment: PreferenceSentiment;
  strength: number;
  confidence: number;
}

const TECHNOLOGY_ALIASES = new Map<string, string>([
  ["react.js", "React"],
  ["reactjs", "React"],
  ["react", "React"],
  ["next.js", "Next.js"],
  ["nextjs", "Next.js"],
  ["vue.js", "Vue"],
  ["vuejs", "Vue"],
  ["vue", "Vue"],
  ["sveltekit", "SvelteKit"],
  ["svelte", "Svelte"],
  ["angular", "Angular"],
  ["typescript", "TypeScript"],
  ["javascript", "JavaScript"],
  ["python", "Python"],
  ["rust", "Rust"],
  ["kotlin", "Kotlin"],
  ["swift", "Swift"],
  ["c#", "C#"],
  ["c++", "C++"],
  ["tailwindcss", "Tailwind CSS"],
  ["tailwind", "Tailwind CSS"],
]);

const SIGNALS: PreferenceSignal[] = [
  {
    pattern: /\b(.+?)\s+is\s+my\s+favou?rite(?:\s+(?:framework|language|library|tool|stack))?(?:\s+for\s+.+?)?(?:[.!?,;]|$)/i,
    sentiment: "like",
    strength: 1,
    confidence: 0.98,
  },
  {
    pattern: /\b(?:my\s+favou?rite(?:\s+\w+){0,3}\s+is|i\s+(?:really\s+)?(?:love|adore))\s+(.+?)(?:[.!?,;]|$)/i,
    sentiment: "like",
    strength: 1,
    confidence: 0.98,
  },
  {
    pattern: /\bi\s+(?:really\s+)?(?:like|prefer|enjoy)\s+(?:coding|working|building)?\s*(?:with|in|using)?\s*(.+?)(?:[.!?,;]|$)/i,
    sentiment: "like",
    strength: 0.85,
    confidence: 0.94,
  },
  {
    pattern: /\bi(?:'m|\s+am)\s+(?:most\s+)?comfortable\s+(?:with|using|in)\s+(.+?)(?:[.!?,;]|$)/i,
    sentiment: "like",
    strength: 0.7,
    confidence: 0.88,
  },
  {
    pattern: /\bi\s+(?:usually|normally|mostly)\s+(?:use|choose|work\s+with|code\s+in)\s+(.+?)(?:[.!?,;]|$)/i,
    sentiment: "like",
    strength: 0.55,
    confidence: 0.76,
  },
  {
    pattern: /\bi\s+(?:really\s+)?(?:hate|dislike|avoid|cannot\s+stand)\s+(?:using|working\s+with)?\s*(.+?)(?:[.!?,;]|$)/i,
    sentiment: "dislike",
    strength: 1,
    confidence: 0.98,
  },
  {
    pattern: /\bi\s+(?:do\s+not|don't)\s+like\s+(?:using|working\s+with)?\s*(.+?)(?:[.!?,;]|$)/i,
    sentiment: "dislike",
    strength: 0.9,
    confidence: 0.96,
  },
  {
    pattern: /\bi\s+(?:no\s+longer|don't\s+anymore|do\s+not\s+anymore)\s+(?:like|prefer|enjoy)\s+(?:using|working\s+with)?\s*(.+?)(?:[.!?,;]|$)/i,
    sentiment: "dislike",
    strength: 0.9,
    confidence: 0.98,
  },
];

const SENSITIVE_SUBJECT_PATTERN =
  /\b(?:password|passcode|api key|token|secret|address|phone|email|religion|politic|ethnicity|race|sexual|medical|health condition|disability)\b/i;

const OPTION_CATALOG: Record<string, { advantages: string[]; tradeoffs: string[]; bestFor: string }> = {
  React: {
    advantages: ["large ecosystem", "strong component model", "flexible deployment choices"],
    tradeoffs: ["requires selecting supporting libraries", "client-heavy apps need performance discipline"],
    bestFor: "interactive interfaces and teams that value ecosystem flexibility",
  },
  "Next.js": {
    advantages: ["routing and server rendering included", "strong React integration", "good production conventions"],
    tradeoffs: ["more framework behavior to learn", "server and cache semantics add complexity"],
    bestFor: "content, SEO, full-stack React, and server-rendered products",
  },
  Vue: {
    advantages: ["approachable templates", "good official tooling", "incremental adoption"],
    tradeoffs: ["smaller hiring and library pool than React", "fewer framework choices at very large scale"],
    bestFor: "productive UI development with a gentler learning curve",
  },
  Svelte: {
    advantages: ["small runtime", "concise components", "excellent direct reactivity"],
    tradeoffs: ["smaller ecosystem", "fewer mature enterprise integrations"],
    bestFor: "lightweight, highly interactive sites and smaller teams",
  },
  "Vanilla TypeScript": {
    advantages: ["minimal dependencies", "direct browser APIs", "small deployment surface"],
    tradeoffs: ["more manual state and component organization", "complex UI reuse takes extra work"],
    bestFor: "small sites, widgets, and dependency-sensitive projects",
  },
};

function normalizedSubject(raw: string): string | undefined {
  const cleaned = raw
    .replace(/\b(?:the\s+most|a\s+lot|for\s+frontend|for\s+websites?|these\s+days|anymore)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length > 80) return undefined;
  if (SENSITIVE_SUBJECT_PATTERN.test(cleaned)) return undefined;

  const lower = cleaned.toLowerCase();
  for (const [alias, canonical] of TECHNOLOGY_ALIASES) {
    if (new RegExp(`(^|[^a-z0-9+#.])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9+#.]|$)`, "i").test(lower)) {
      return canonical;
    }
  }

  return cleaned
    .split(/\s+/)
    .slice(0, 5)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function preferenceId(category: PreferenceCategory, subject: string): string {
  return `PREF_${createHash("sha256").update(`${category}:${subject.toLowerCase()}`).digest("hex").slice(0, 12)}`;
}

function containsAlias(text: string, alias: string): boolean {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, "i").test(text);
}

export function inferPreferenceScope(statement: string): PreferenceScope {
  const lower = statement.toLowerCase();
  if (/\b(frontend|front-end|website|web app|ui)\b/.test(lower)) return "frontend";
  if (/\b(backend|server|api)\b/.test(lower)) return "backend";
  if (/\b(mobile|android|ios)\b/.test(lower)) return "mobile";
  if (/\b(desktop|windows|macos|linux app)\b/.test(lower)) return "desktop";
  return "global";
}

export function extractPreferences(statement: string, now = new Date().toISOString()): UserPreference[] {
  const results: UserPreference[] = [];
  for (const signal of SIGNALS) {
    const match = signal.pattern.exec(statement);
    if (!match) continue;
    const subject = normalizedSubject(match[1]);
    if (!subject) continue;
    const category: PreferenceCategory = TECHNOLOGY_ALIASES.has(subject.toLowerCase())
      || [...TECHNOLOGY_ALIASES.values()].includes(subject)
      ? "technology"
      : "other";
    results.push({
      id: preferenceId(category, subject),
      category,
      subject,
      sentiment: signal.sentiment,
      strength: signal.strength,
      confidence: signal.confidence,
      scope: inferPreferenceScope(statement),
      sourceStatement: statement.trim(),
      evidenceCount: 1,
      firstSeen: now,
      lastSeen: now,
    });
    break;
  }
  return results;
}

export function extractForgottenPreferenceSubjects(statement: string): string[] {
  if (!/\b(?:forget|remove|delete|clear)\b.*\b(?:preference|favourite|favorite|like|dislike)\b/i.test(statement)) {
    return [];
  }
  const subjects = new Set<string>();
  for (const [alias, canonical] of TECHNOLOGY_ALIASES) {
    if (statement.toLowerCase().includes(alias)) subjects.add(canonical);
  }
  return [...subjects];
}

export function mergePreference(
  existing: UserPreference | undefined,
  incoming: UserPreference,
): UserPreference {
  if (!existing) return incoming;
  const agrees = existing.sentiment === incoming.sentiment;
  return {
    ...existing,
    ...incoming,
    strength: agrees
      ? Math.min(1, Math.max(existing.strength, incoming.strength) + 0.05)
      : incoming.strength,
    confidence: agrees
      ? Math.min(1, Math.max(existing.confidence, incoming.confidence) + 0.03)
      : incoming.confidence,
    evidenceCount: existing.evidenceCount + 1,
    firstSeen: existing.firstSeen,
  };
}

export function rankPreferences(
  preferences: UserPreference[],
  query = "",
  scope?: PreferenceScope,
): UserPreference[] {
  const tokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  return preferences
    .filter((preference) => !scope || preference.scope === "global" || preference.scope === scope)
    .map((preference) => {
      const text = `${preference.category} ${preference.subject} ${preference.scope}`.toLowerCase();
      const queryScore = tokens.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0);
      const sentimentScore = preference.sentiment === "like" ? 1 : preference.sentiment === "neutral" ? 0 : -1;
      return {
        preference,
        score:
          queryScore * 4
          + preference.confidence * 3
          + preference.strength * 2
          + Math.log2(preference.evidenceCount + 1)
          + sentimentScore,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ preference }) => preference);
}

export function recommendFrontendOptions(
  preferences: UserPreference[],
  task: string,
  requestedOptions?: string[],
): {
  shouldAsk: boolean;
  reason: string;
  options: Array<{
    name: string;
    preferenceMatch: boolean;
    advantages: string[];
    tradeoffs: string[];
    bestFor: string;
  }>;
} {
  const lowerTask = task.toLowerCase();
  const explicitStack = [...TECHNOLOGY_ALIASES.entries()].find(([alias]) => containsAlias(lowerTask, alias));
  const broadRequest = /\b(frontend|front-end|website|web app|landing page|dashboard)\b/.test(lowerTask);
  const constraints = /\b(existing|current repo|no framework|static|seo|server rendered|ssr|single file)\b/.test(lowerTask);
  const favorite = rankPreferences(
    preferences.filter((preference) =>
      preference.category === "technology"
      && preference.sentiment === "like"
      && preference.confidence >= 0.75),
    "technology",
    "frontend",
  )[0];

  const defaults = ["React", "Next.js", "Vue", "Svelte", "Vanilla TypeScript"];
  const names = [...new Set([
    ...(favorite && OPTION_CATALOG[favorite.subject] ? [favorite.subject] : []),
    ...(requestedOptions?.length ? requestedOptions : defaults),
  ])].filter((name) => OPTION_CATALOG[name]).slice(0, 5);

  return {
    shouldAsk: broadRequest && !explicitStack && !constraints,
    reason: explicitStack
      ? `The request already names ${explicitStack[1]}.`
      : constraints
        ? "Repository or delivery constraints provide enough evidence to choose without interrupting."
        : favorite
          ? `${favorite.subject} is a remembered preference, but the task is broad enough to compare alternatives.`
          : "The task is broad and no reliable framework preference is stored.",
    options: names.map((name) => ({
      name,
      preferenceMatch: favorite?.subject === name,
      ...OPTION_CATALOG[name],
    })),
  };
}
