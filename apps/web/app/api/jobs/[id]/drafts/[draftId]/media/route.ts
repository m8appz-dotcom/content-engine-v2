import { createReadStream, realpathSync, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
import { getDb } from '../../../../../../lib/db';
import { errorResponse } from '../../../../../../lib/http';
import { getDraft } from '../../../../../../../../../packages/core/src/db/repositories';

export async function GET(req: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  try {
    const { id, draftId } = await params, db = await getDb();
    const draft = getDraft(db, id, draftId);
    if (!draft) throw Object.assign(new Error('Draft not found.'), { code: 'not_found' });
    const sheet = new URL(req.url).searchParams.get('kind') === 'sheet';
    const target = realpathSync(sheet ? draft.contact_sheet_path : draft.video_path);
    const account=(db as any).workspaceActor;
    const root = realpathSync(account?path.join(process.env.WORKSPACE_STATE!,'content-accounts',account,'outputs'):(process.env.OUTPUTS_PATH || path.resolve('outputs')));
    if (!target.startsWith(root + path.sep)) throw Object.assign(new Error('Draft not found.'), { code: 'not_found' });
    const size = statSync(target).size;
    const headers: Record<string, string> = { 'Content-Type': sheet ? 'image/png' : 'video/mp4', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
    let start = 0, end = size - 1, status = 200;
    const range = req.headers.get('range');
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size)
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length'] = String(end - start + 1);
    return new Response(Readable.toWeb(createReadStream(target, { start, end })) as ReadableStream, { status, headers });
  } catch (error) { return errorResponse(error); }
}
