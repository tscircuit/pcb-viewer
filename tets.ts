import { readdirSync, renameSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { Dirent } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = new URL('.', __filename).pathname;
const baseDir = join(__dirname, 'examples');

function renameFilesRecursively(dir: string): void {
  readdirSync(dir, { withFileTypes: true }).forEach((entry: Dirent) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      renameFilesRecursively(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.stories.tsx')) {
      const newName = entry.name.replace(/\.stories\.tsx$/, '.fixture.tsx');
      const newPath = join(dir, newName);
      renameSync(fullPath, newPath);
      console.log(`Renamed: ${fullPath} → ${newPath}`);
    }
  });
}

renameFilesRecursively(baseDir);
