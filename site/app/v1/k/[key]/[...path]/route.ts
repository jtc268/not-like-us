import { authorize, contentTypeFor, errorResponse, feed, json, text } from '../../../../../lib/stream';

type Context = { params: Promise<{ key: string; path: string[] }> | { key: string; path: string[] } };

// Serves one file from the stream with the key in the URL, so a tool that
// installs a skill from a plain URL can subscribe:
//   /v1/k/<key>/SKILL.md          the skill
//   /v1/k/<key>/AGENTS.md         agent instructions
//   /v1/k/<key>/prompt.txt        the paste block
//   /v1/k/<key>/manual/<path>     any manual file, for example manual/tools/claude/DESIGN.md
export async function GET(_request: Request, context: Context) {
  try {
    const { key, path } = await context.params;
    const verdict = await authorize(key);
    if (!verdict.ok) return json({ error: verdict.message }, verdict.status);
    const current = await feed();
    const wanted = path.join('/');
    const aliases: Record<string, string> = {
      'SKILL.md': 'skills/not-like-us/SKILL.md',
      'prompt.txt': 'manual/prompt.txt',
      'CHANGELOG.md': 'CHANGELOG.md',
      'AGENTS.md': 'AGENTS.md',
    };
    const file = aliases[wanted] ?? wanted;
    const body = current.files[file];
    if (body === undefined) return json({ error: `No file ${wanted} in the stream.` }, 404);
    return text(body, contentTypeFor(file), 200, { 'x-not-like-us-version': current.version });
  } catch (error) {
    return errorResponse(error);
  }
}
