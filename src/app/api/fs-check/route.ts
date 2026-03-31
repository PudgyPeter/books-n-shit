import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function run(cmd: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 8000 });
    return stdout || stderr || '(no output)';
  } catch (e: any) {
    return e?.message || 'error';
  }
}

export async function GET() {
  const results: any = {};

  // Full raw mount table
  results.procMounts = await run('cat /proc/mounts');

  // df to see actual disk usage per mount point
  results.df = await run('df -h');

  // List /data with hidden files using shell
  results.lsData = await run('ls -la /data/');
  results.lsDataAll = await run('ls -laR /data/');

  // Find ALL files in /data regardless of how hidden
  results.findData = await run('find /data -maxdepth 5 -ls 2>&1 | head -100');

  // Find any json file anywhere on disk > 10KB
  results.findJson = await run('find / -name "*.json" -size +10k -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "/proc/*" -not -path "/sys/*" 2>/dev/null | head -30');

  // Find anything named books
  results.findBooks = await run('find / -name "*books*" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "/proc/*" -not -path "/sys/*" 2>/dev/null | head -30');

  // Check inode usage on /data mount to see if data exists but is unlinked
  results.statData = await run('stat /data');
  results.duData = await run('du -sh /data/ 2>&1');

  return NextResponse.json(results);
}
