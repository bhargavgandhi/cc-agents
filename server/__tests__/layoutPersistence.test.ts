import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Isolated HOME via os.homedir() (portable; see fileStateAdapter.test.ts).
let tempHome: string;
vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return { ...actual, homedir: () => tempHome };
});

const { loadLayout, getLayoutBackupPath } = await import('../src/layoutPersistence.js');

const layoutPath = () => path.join(tempHome, '.pixel-agents', 'layout.json');
const writeSaved = (layout: Record<string, unknown>) => {
  fs.mkdirSync(path.dirname(layoutPath()), { recursive: true });
  fs.writeFileSync(layoutPath(), JSON.stringify(layout));
};
const readSaved = () =>
  JSON.parse(fs.readFileSync(layoutPath(), 'utf8')) as Record<string, unknown>;

const custom = { version: 1, cols: 3, rows: 3, layoutRevision: 1, note: 'my office' };
const bundled = { version: 1, cols: 9, rows: 9, layoutRevision: 2 };

describe('loadLayout revision reset', () => {
  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'pxl-layout-test-'));
  });
  afterEach(() => {
    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  it('backs up the saved layout before replacing it with a newer bundled default', () => {
    writeSaved(custom);
    const result = loadLayout(bundled);
    expect(result?.wasReset).toBe(true);
    expect(readSaved()).toEqual(bundled);
    expect(JSON.parse(fs.readFileSync(getLayoutBackupPath(1), 'utf8'))).toEqual(custom);
  });

  it('never overwrites an existing backup for the same revision', () => {
    writeSaved(custom);
    fs.writeFileSync(getLayoutBackupPath(1), '{"original":true}');
    expect(loadLayout(bundled)?.wasReset).toBe(true);
    expect(fs.readFileSync(getLayoutBackupPath(1), 'utf8')).toBe('{"original":true}');
  });

  it('keeps the saved layout when the backup cannot be written', () => {
    writeSaved(custom);
    // A directory squatting on the backup path: the copy fails and no backup exists.
    fs.mkdirSync(getLayoutBackupPath(1));
    const result = loadLayout(bundled);
    expect(result?.wasReset).toBe(false);
    expect(result?.layout).toEqual(custom);
    expect(readSaved()).toEqual(custom);
  });

  it('leaves a layout at or above the bundled revision alone, without a backup', () => {
    writeSaved({ ...custom, layoutRevision: 9000 });
    expect(loadLayout(bundled)?.wasReset).toBe(false);
    expect(fs.existsSync(getLayoutBackupPath(9000))).toBe(false);
  });
});
