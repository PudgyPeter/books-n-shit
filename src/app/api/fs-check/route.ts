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

  // Volume is mounted at /main - list everything there
  results.lsMain = await run('ls -laR /main/');
  results.duMain = await run('du -sh /main/');
  results.findMain = await run('find /main -ls 2>&1');
  results.booksContent = await run('cat /main/books.json 2>/dev/null || echo "NOT FOUND AT /main/books.json"');

  return NextResponse.json(results);
}
