import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  const results: any = {
    checks: [],
    possiblePaths: [],
    mountedVolumes: [],
    systemInfo: {
      cwd: process.cwd(),
      nodeVersion: process.version,
      platform: process.platform
    }
  };

  // Check various possible data locations
  const pathsToCheck = [
    '/data',
    '/app/data', 
    '/app/.data',
    '/tmp/data',
    '/var/data',
    path.join(process.cwd(), 'data'),
    path.join(process.cwd(), '.data'),
    '/volume/data',
    '/mnt/data'
  ];

  for (const checkPath of pathsToCheck) {
    try {
      const stats = await fs.stat(checkPath);
      const exists = true;
      let files: string[] = [];
      let size = 0;
      
      if (stats.isDirectory()) {
        try {
          files = await fs.readdir(checkPath);
          
          // Calculate total size
          for (const file of files) {
            try {
              const filePath = path.join(checkPath, file);
              const fileStats = await fs.stat(filePath);
              if (fileStats.isFile()) {
                size += fileStats.size;
              }
            } catch {
              // Skip files we can't stat
            }
          }
        } catch (dirErr) {
          // Can't read directory
        }
      }

      results.possiblePaths.push({
        path: checkPath,
        exists: true,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        fileCount: files.length,
        files: files.slice(0, 10), // Limit to first 10 files
        totalSize: size,
        modified: stats.mtime
      });
    } catch (err) {
      results.possiblePaths.push({
        path: checkPath,
        exists: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }

  // Try to check mount points (Linux/Unix style)
  try {
    const mounts = await fs.readFile('/proc/mounts', 'utf-8');
    const mountLines = mounts.split('\n').filter(line => line.trim());
    results.mountedVolumes = mountLines.map(line => {
      const parts = line.split(' ');
      return {
        device: parts[0] || '',
        mountPoint: parts[1] || '',
        fsType: parts[2] || '',
        options: parts[3] || ''
      };
    }).filter(mount => mount.mountPoint.includes('/data') || mount.mountPoint.includes('/volume'));
  } catch (mountErr) {
    results.mountedVolumes = [{ error: 'Cannot read mount info' }];
  }

  // Deep scan: find any large JSON files or books.json anywhere on the container
  const foundFiles: any[] = [];
  async function scanDir(dir: string, depth: number) {
    if (depth > 4) return;
    const skipDirs = ['/proc', '/sys', '/dev', '/run', '/snap', '/app/node_modules', '/app/.next'];
    if (skipDirs.some(s => dir.startsWith(s))) return;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath, depth + 1);
        } else if (entry.isFile()) {
          try {
            const stat = await fs.stat(fullPath);
            if (entry.name.includes('books') || entry.name.endsWith('.json') && stat.size > 1000) {
              foundFiles.push({ path: fullPath, size: stat.size, modified: stat.mtime });
            }
          } catch { }
        }
      }
    } catch { }
  }
  await scanDir('/', 0);
  results.foundFiles = foundFiles;

  // Check environment variables
  results.envVars = {
    DATA_PATH: process.env.DATA_PATH,
    HOME: process.env.HOME,
    PWD: process.env.PWD
  };

  return NextResponse.json(results);
}
