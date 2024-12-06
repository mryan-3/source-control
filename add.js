import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const readIndex = (indexPath) => {
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8')
    return parseIndexContent(content) // Parse the readable format
  }
  return {
    Head: 'main',
    Merge: null,
    Help: 'g?',
    Staged: [],
    Untracked: [],
    Unstaged: [],
  }
}

const updateIndex = (indexPath, updates) => {
  const indexData = readIndex(indexPath)

  // Apply updates
  if (updates.Staged) {
    indexData.Staged = [...new Set([...indexData.Staged, ...updates.Staged])] // Merge and deduplicate
  }
  if (updates.Untracked) {
    indexData.Untracked = indexData.Untracked.filter(
      (file) => !updates.Staged.includes(file),
    ) // Remove staged files from untracked
  }
  if (updates.Unstaged) {
    indexData.Unstaged = updates.Unstaged
  }

  // Write the updated index
  writeIndexFile(indexPath, indexData)
}

const writeIndexFile = (indexPath, indexData) => {
  const content = [
    `Head: ${indexData.Head}`,
    `Merge: ${indexData.Merge || 'None'}`,
    `Help: ${indexData.Help}`,
    '',
    `Untracked (${indexData.Untracked.length})`,
    ...indexData.Untracked.map((file) => `? ${file}`),
    '',
    `Unstaged (${indexData.Unstaged.length})`,
    ...indexData.Unstaged.map((file) => `M ${file}`),
    '',
    `Staged (${indexData.Staged.length})`,
    ...indexData.Staged.map((file) => `A ${file}`),
  ].join('\n')

  fs.writeFileSync(indexPath, content, 'utf-8')
}

const parseIndexContent = (content) => {
  const lines = content.split('\n')
  const indexData = {
    Head: extractValue(lines, 'Head'),
    Merge: extractValue(lines, 'Merge'),
    Help: extractValue(lines, 'Help'),
    Staged: extractSection(lines, 'Staged'),
    Untracked: extractSection(lines, 'Untracked'),
    Unstaged: extractSection(lines, 'Unstaged'),
  }
  return indexData
}

const extractValue = (lines, key) => {
  const line = lines.find((l) => l.startsWith(`${key}:`))
  return line ? line.split(': ')[1] : null
}

const extractSection = (lines, sectionName) => {
  const start = lines.indexOf(
    `${sectionName} (${lines.find((line) => line.startsWith(sectionName)).match(/\d+/)[0]})`,
  )
  const end =
    lines
      .slice(start + 1)
      .findIndex((line) => line.startsWith('') || /^[A-Z]/.test(line)) +
    start +
    1
  return lines.slice(start + 1, end).map((l) => l.slice(2)) // Strip the prefixes ('? ', 'M ', 'A ')
}

const hashObject = (content) => {
  const hash = crypto.createHash('sha1')
  hash.update(content)
  return hash.digest('hex')
}

const storeObject = (objectsPath, hash, content) => {
  const dirName = hash.slice(0, 2)
  const fileName = hash.slice(2)
  const objectDir = path.join(objectsPath, dirName)

  // Ensure directory exists
  if (!fs.existsSync(objectDir)) {
    fs.mkdirSync(objectDir)
  }

  const objectPath = path.join(objectDir, fileName)
  if (!fs.existsSync(objectPath)) {
    fs.writeFileSync(objectPath, content, 'utf-8')
  }
}

const getIgnoredPatterns = (repoPath) => {
  const ignoredFilePath = path.join(repoPath, '.shiftignore')
  if (!fs.existsSync(ignoredFilePath)) {
    return []
  }

  return fs
    .readFileSync(ignoredFilePath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
}

const isIgnored = (filePath, repoPath, ignoredPatterns) => {
  const relativePath = path.relative(repoPath, filePath)
  return ignoredPatterns.some((pattern) => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*')) // Convert simple wildcards to regex
    return regex.test(relativePath)
  })
}

const getAllFiles = (repoPath, ignoredPatterns = []) => {
  const files = []
  const items = fs.readdirSync(repoPath, { withFileTypes: true })

  items.forEach((item) => {
    const fullPath = path.join(repoPath, item.name)
    if (
      item.isDirectory() &&
      !item.name.startsWith('.') &&
      !isIgnored(fullPath, repoPath, ignoredPatterns)
    ) {
      files.push(...getAllFiles(fullPath, ignoredPatterns)) // Recurse into subdirectories
    } else if (
      item.isFile() &&
      !isIgnored(fullPath, repoPath, ignoredPatterns)
    ) {
      files.push(fullPath)
    }
  })

  return files
}

const add = (repoPath, filesToStage) => {
  const shiftPath = path.join(repoPath, '.shift')
  const objectsPath = path.join(shiftPath, 'objects')
  const indexFile = path.join(shiftPath, 'index')

  if (!fs.existsSync(shiftPath)) {
    console.error('Repository not initialized')
    return
  }

  const ignoredPatterns = getIgnoredPatterns(repoPath)
  const filesInRepo = getAllFiles(repoPath, ignoredPatterns)

  let filesToWrite

  if (filesToStage === '--all' || filesToStage === '*') {
    filesToWrite = filesInRepo
  } else {
    filesToWrite = filesToStage
      .map((file) => path.resolve(repoPath, file))
      .filter((file) => {
        if (!filesInRepo.includes(file)) {
          console.error(`File ${file} does not exist in the repository`)
          return false
        }
        return true
      })
  }

  const stagedFiles = []
  filesToWrite.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8')
    const hash = hashObject(content)

    storeObject(objectsPath, hash, content)

    stagedFiles.push({ path: filePath, hash })
  })

  // Write the staged files to the index
  const indexData = readIndex(indexFile)
  stagedFiles.forEach((file) => {
    indexData.Staged.push(file.path)
    indexData.Untracked = indexData.Untracked.filter(
      (untracked) => untracked !== file.path,
    )
  })

  writeIndexFile(indexPath, indexData)

  console.log('Files staged successfully')
  stagedFiles.forEach((file) => {
    console.log(`filepath: ${file.path} -> hash: ${file.hash}`)
  })
}

export { storeObject, hashObject, add, readIndex }
