import { existsSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

export const exampleSources = ['docs/architecture.md', 'docs/images/original-app-baseline.jpg', 'docs/images/editorial-reviewed-script-original.jpg'] as const;
export function requirePublicSource(value: unknown) {
  if (typeof value !== 'string' || !(exampleSources as readonly string[]).includes(value))
    throw Object.assign(new Error('Choose one of the prepared public sources.'), { code: 'forbidden' });
  const root = realpathSync(process.cwd());
  const target = path.resolve(root, value);
  if (!existsSync(target) || !realpathSync(target).startsWith(root + path.sep) || !statSync(target).isFile())
    throw Object.assign(new Error('This source is unavailable.'), { code: 'not_found' });
  return target;
}
