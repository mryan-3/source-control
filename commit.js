import { hashObject } from "./add"

const commitFiles = (repoPath, message) => {
    const shiftPath = path.join(repoPath, '.shift')
    const objectsPath = path.join(shiftPath, 'objects')
    const indexFile = path.join(shiftPath, 'index')

    if (!fs.existsSync(shiftPath) || !fs.existsSync(indexFile)) {
        console.error('No staged changes to commit. Stage files before committing')
        return
    }

    const indexContent = fs.readFileSync(indexFile, 'utf-8')
    const indexEntries = indexContent
        .split('\n')
        .map((entry) => entry.trim())
        .filter((entry) => entry && !entry.startsWith('#'))

    if (indexEntries.length === 0) {
        console.error('No changes to commit')
        return
    }

    const commitId = hashObject(indexContent)
    const commitPath = path.join(objectsPath, commitId)

    if (fs.existsSync(commitPath)) {
        console.error('Commit already exists')
        return
    }

    fs.mkdirSync(commitPath)

    indexEntries.forEach((entry) => {
        const [objectType, objectId] = entry.split(' ')
        const objectPath = path.join(objectsPath, objectId)

        fs.copyFileSync(objectPath, path.join(commitPath, objectId))
    })

    fs.writeFileSync(path.join(commitPath, 'message'), message)
    fs.writeFileSync(path.join(shiftPath, 'HEAD'), commitId)
    console.log('Commit created')
}
