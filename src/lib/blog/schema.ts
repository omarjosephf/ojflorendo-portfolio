import {
  BLOG_AUTHOR,
  BLOG_POST_SCHEMA_VERSION,
  type BlogAuthor,
  type BlogCalloutBlock,
  type BlogContentBlock,
  type BlogHeadingBlock,
  type BlogListBlock,
  type BlogParagraphBlock,
  type BlogPost,
  type BlogSeo,
  type BlogSource,
} from "./types";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UNSAFE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

type JsonObject = Record<string, unknown>;

export class BlogPostValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[], source = "blog post") {
    super(`${source} is invalid:\n- ${issues.join("\n- ")}`);
    this.name = "BlogPostValidationError";
    this.issues = [...issues];
  }
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateKeys(
  value: JsonObject,
  required: readonly string[],
  optional: readonly string[],
  path: string,
  issues: string[],
) {
  const allowed = new Set([...required, ...optional]);

  for (const key of required) {
    if (!Object.hasOwn(value, key)) issues.push(`${path}.${key} is required`);
  }

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(`${path}.${key} is not allowed`);
  }
}

function readText(
  value: unknown,
  path: string,
  issues: string[],
  { min = 1, max, singleLine = false }: { min?: number; max: number; singleLine?: boolean },
) {
  if (typeof value !== "string") {
    issues.push(`${path} must be a string`);
    return "";
  }

  if (value !== value.trim()) issues.push(`${path} must not have leading or trailing whitespace`);
  if (value.length < min || value.length > max) {
    issues.push(`${path} must contain between ${min} and ${max} characters`);
  }
  if (UNSAFE_CONTROL_CHARACTERS.test(value)) issues.push(`${path} contains an unsafe control character`);
  if (singleLine && /[\r\n]/.test(value)) issues.push(`${path} must be a single line`);

  return value;
}

function readIdentifier(value: unknown, path: string, issues: string[], max = 80) {
  const identifier = readText(value, path, issues, { max, singleLine: true });
  if (identifier && !SLUG_PATTERN.test(identifier)) {
    issues.push(`${path} must use lowercase words separated by single hyphens`);
  }
  return identifier;
}

function isCalendarDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function readDate(value: unknown, path: string, issues: string[]) {
  const date = readText(value, path, issues, { min: 10, max: 10, singleLine: true });
  if (date && !isCalendarDate(date)) issues.push(`${path} must be a real calendar date in YYYY-MM-DD form`);
  return date;
}

function readOptionalDate(value: unknown, path: string, issues: string[]) {
  if (value === null) return null;
  return readDate(value, path, issues);
}

function readInternalPath(value: unknown, path: string, issues: string[]) {
  const url = readText(value, path, issues, { max: 300, singleLine: true });
  if (
    url &&
    (!url.startsWith("/") || url.startsWith("//") || url.includes("\\") || /\s/.test(url))
  ) {
    issues.push(`${path} must be a same-origin path beginning with one slash`);
  }
  return url;
}

function readSourceUrl(value: unknown, path: string, issues: string[]) {
  const url = readText(value, path, issues, { max: 2_000, singleLine: true });
  if (!url) return url;

  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\") && !/\s/.test(url)) {
    return url;
  }

  // WHATWG URL parsing repairs ambiguous inputs such as `https:/example.com`.
  // React would still render the original value, which a browser can resolve as
  // a same-origin path. Require the unambiguous wire form before parsing it.
  if (!url.startsWith("https://") || url.includes("\\") || /\s/.test(url)) {
    issues.push(`${path} must be an HTTPS URL without embedded credentials`);
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      issues.push(`${path} must be an HTTPS URL without embedded credentials`);
    }
  } catch {
    issues.push(`${path} must be an HTTPS URL or a same-origin path`);
  }

  return url;
}

function parseAuthor(value: unknown, path: string, issues: string[]): BlogAuthor {
  if (!isObject(value)) {
    issues.push(`${path} must be an object`);
    return { ...BLOG_AUTHOR };
  }
  validateKeys(value, ["name", "url"], [], path, issues);
  const name = readText(value.name, `${path}.name`, issues, { min: 2, max: 80, singleLine: true });
  const url = readInternalPath(value.url, `${path}.url`, issues);
  if (name !== BLOG_AUTHOR.name) issues.push(`${path}.name must be ${JSON.stringify(BLOG_AUTHOR.name)}`);
  if (url !== BLOG_AUTHOR.url) issues.push(`${path}.url must be ${JSON.stringify(BLOG_AUTHOR.url)}`);
  return { ...BLOG_AUTHOR };
}

function parseHeadingBlock(value: JsonObject, path: string, issues: string[]): BlogHeadingBlock {
  validateKeys(value, ["type", "id", "level", "text"], [], path, issues);
  const level = value.level;
  if (level !== 2 && level !== 3) issues.push(`${path}.level must be 2 or 3`);
  return {
    type: "heading",
    id: readIdentifier(value.id, `${path}.id`, issues),
    level: level === 3 ? 3 : 2,
    text: readText(value.text, `${path}.text`, issues, { min: 2, max: 120, singleLine: true }),
  };
}

function parseParagraphBlock(value: JsonObject, path: string, issues: string[]): BlogParagraphBlock {
  validateKeys(value, ["type", "text"], [], path, issues);
  return {
    type: "paragraph",
    text: readText(value.text, `${path}.text`, issues, { max: 5_000 }),
  };
}

function parseListBlock(value: JsonObject, path: string, issues: string[]): BlogListBlock {
  validateKeys(value, ["type", "style", "items"], [], path, issues);
  const style = value.style;
  if (style !== "ordered" && style !== "unordered") {
    issues.push(`${path}.style must be ordered or unordered`);
  }

  const items: string[] = [];
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 30) {
    issues.push(`${path}.items must contain between 1 and 30 entries`);
  } else {
    value.items.forEach((item, index) => {
      items.push(readText(item, `${path}.items[${index}]`, issues, { max: 1_000 }));
    });
  }

  return { type: "list", style: style === "ordered" ? "ordered" : "unordered", items };
}

function parseCalloutBlock(value: JsonObject, path: string, issues: string[]): BlogCalloutBlock {
  validateKeys(value, ["type", "tone", "text"], ["title"], path, issues);
  const tone = value.tone;
  if (tone !== "note" && tone !== "warning") issues.push(`${path}.tone must be note or warning`);

  const block: BlogCalloutBlock = {
    type: "callout",
    tone: tone === "warning" ? "warning" : "note",
    text: readText(value.text, `${path}.text`, issues, { max: 2_000 }),
  };
  if (Object.hasOwn(value, "title")) {
    block.title = readText(value.title, `${path}.title`, issues, {
      min: 2,
      max: 120,
      singleLine: true,
    });
  }
  return block;
}

function parseBlocks(value: unknown, path: string, issues: string[]): BlogContentBlock[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    issues.push(`${path} must contain between 1 and 100 content blocks`);
    return [];
  }

  const blocks = value.map((block, index): BlogContentBlock => {
    const blockPath = `${path}[${index}]`;
    if (!isObject(block)) {
      issues.push(`${blockPath} must be an object`);
      return { type: "paragraph", text: "" };
    }

    switch (block.type) {
      case "heading":
        return parseHeadingBlock(block, blockPath, issues);
      case "paragraph":
        return parseParagraphBlock(block, blockPath, issues);
      case "list":
        return parseListBlock(block, blockPath, issues);
      case "callout":
        return parseCalloutBlock(block, blockPath, issues);
      default:
        issues.push(`${blockPath}.type must be heading, paragraph, list or callout`);
        return { type: "paragraph", text: "" };
    }
  });

  const headingIds = blocks.filter((block): block is BlogHeadingBlock => block.type === "heading").map((block) => block.id);
  if (new Set(headingIds).size !== headingIds.length) issues.push(`${path} must not repeat heading ids`);

  let hasLevelTwoHeading = false;
  for (const block of blocks) {
    if (block.type !== "heading") continue;
    if (block.level === 2) hasLevelTwoHeading = true;
    if (block.level === 3 && !hasLevelTwoHeading) {
      issues.push(`${path} must not place a level 3 heading before the first level 2 heading`);
      break;
    }
  }
  return blocks;
}

function parseSource(value: unknown, path: string, issues: string[]): BlogSource {
  if (!isObject(value)) {
    issues.push(`${path} must be an object`);
    return { id: "", title: "", url: "" };
  }
  validateKeys(value, ["id", "title", "url"], ["publisher", "accessedAt"], path, issues);
  const source: BlogSource = {
    id: readIdentifier(value.id, `${path}.id`, issues),
    title: readText(value.title, `${path}.title`, issues, { max: 200, singleLine: true }),
    url: readSourceUrl(value.url, `${path}.url`, issues),
  };
  if (Object.hasOwn(value, "publisher")) {
    source.publisher = readText(value.publisher, `${path}.publisher`, issues, {
      max: 120,
      singleLine: true,
    });
  }
  if (Object.hasOwn(value, "accessedAt")) {
    source.accessedAt = readDate(value.accessedAt, `${path}.accessedAt`, issues);
  }
  return source;
}

function parseSources(value: unknown, path: string, issues: string[]): BlogSource[] {
  if (!Array.isArray(value) || value.length > 30) {
    issues.push(`${path} must be an array containing no more than 30 sources`);
    return [];
  }
  const sources = value.map((source, index) => parseSource(source, `${path}[${index}]`, issues));
  const ids = sources.map((source) => source.id);
  if (new Set(ids).size !== ids.length) issues.push(`${path} must not repeat source ids`);
  return sources;
}

function parseSeo(value: unknown, path: string, issues: string[]): BlogSeo {
  if (!isObject(value)) {
    issues.push(`${path} must be an object`);
    return { title: "", description: "", keywords: [] };
  }
  validateKeys(value, ["title", "description", "keywords"], [], path, issues);

  const keywords: string[] = [];
  if (!Array.isArray(value.keywords) || value.keywords.length < 1 || value.keywords.length > 12) {
    issues.push(`${path}.keywords must contain between 1 and 12 entries`);
  } else {
    value.keywords.forEach((keyword, index) => {
      keywords.push(
        readText(keyword, `${path}.keywords[${index}]`, issues, {
          min: 2,
          max: 40,
          singleLine: true,
        }),
      );
    });
    const normalised = keywords.map((keyword) => keyword.toLocaleLowerCase("en-GB"));
    if (new Set(normalised).size !== normalised.length) issues.push(`${path}.keywords must be unique`);
  }

  return {
    title: readText(value.title, `${path}.title`, issues, { min: 4, max: 70, singleLine: true }),
    description: readText(value.description, `${path}.description`, issues, {
      min: 10,
      max: 170,
      singleLine: true,
    }),
    keywords,
  };
}

/**
 * Validate untrusted JSON and copy only the allowlisted blog fields.
 *
 * This parser intentionally returns plain-text blocks rather than accepting a
 * markup language. A renderer can therefore use normal React text children and
 * never evaluate repository or model output.
 */
export function parseBlogPost(value: unknown, source = "blog post"): BlogPost {
  const issues: string[] = [];
  if (!isObject(value)) throw new BlogPostValidationError(["root must be an object"], source);

  validateKeys(
    value,
    [
      "schemaVersion",
      "status",
      "slug",
      "title",
      "excerpt",
      "publishedAt",
      "updatedAt",
      "author",
      "disclosure",
      "blocks",
      "sources",
      "seo",
    ],
    [],
    "root",
    issues,
  );

  if (value.schemaVersion !== BLOG_POST_SCHEMA_VERSION) {
    issues.push(`root.schemaVersion must be ${BLOG_POST_SCHEMA_VERSION}`);
  }

  const status = value.status;
  if (status !== "draft" && status !== "published") {
    issues.push("root.status must be draft or published");
  }

  const publishedAt = readOptionalDate(value.publishedAt, "root.publishedAt", issues);
  const updatedAt = readOptionalDate(value.updatedAt, "root.updatedAt", issues);
  if (status === "published" && publishedAt === null) {
    issues.push("root.publishedAt is required when root.status is published");
  }
  if (status === "draft" && publishedAt !== null) {
    issues.push("root.publishedAt must be null while root.status is draft");
  }
  if (publishedAt && updatedAt && updatedAt < publishedAt) {
    issues.push("root.updatedAt must not be earlier than root.publishedAt");
  }

  const sources = parseSources(value.sources, "root.sources", issues);
  if (status === "published" && sources.length < 1) {
    issues.push("root.sources must contain at least one source for a published post");
  }

  const post: BlogPost = {
    schemaVersion: BLOG_POST_SCHEMA_VERSION,
    status: status === "published" ? "published" : "draft",
    slug: readIdentifier(value.slug, "root.slug", issues),
    title: readText(value.title, "root.title", issues, { min: 4, max: 120, singleLine: true }),
    excerpt: readText(value.excerpt, "root.excerpt", issues, {
      min: 10,
      max: 240,
      singleLine: true,
    }),
    publishedAt,
    updatedAt,
    author: parseAuthor(value.author, "root.author", issues),
    disclosure: readText(value.disclosure, "root.disclosure", issues, {
      min: 10,
      max: 500,
      singleLine: true,
    }),
    blocks: parseBlocks(value.blocks, "root.blocks", issues),
    sources,
    seo: parseSeo(value.seo, "root.seo", issues),
  };

  if (issues.length > 0) throw new BlogPostValidationError(issues, source);
  return post;
}
