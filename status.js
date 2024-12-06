import fs from 'fs';
import path from 'path';
import { readIndex } from './add';

const status = (repoPath) => {
  const shiftPath = path.join(repoPath, '.shift');
  const indexPath = path.join(shiftPath, 'index');

  if (!fs.existsSync(indexPath)) {
    console.log('No changes staged or tracked.');
    return;
  }

  const indexData = readIndex(indexPath);
  console.log(`Head: ${indexData.Head}`);
  console.log('Untracked:');
  indexData.Untracked.forEach((file) => console.log(`? ${file}`));
  console.log('Staged:');
  indexData.Staged.forEach((file) => console.log(`A ${file}`));
  console.log('Unstaged:');
  indexData.Unstaged.forEach((file) => console.log(`M ${file}`));
};
export default status;
