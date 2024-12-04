import fs, { access, mkdir, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

const initRepository = (initPath) => {
  const shiftPath = path.join(initPath, '.shift')
  if (fs.existsSync(shiftPath)) {
    console.log('Repository already initialized')
    return
  }
    mkdirSync(shiftPath)
    mkdirSync(path.join(shiftPath, 'objects'))
    mkdirSync(path.join(shiftPath, 'refs'))
    writeFileSync(path.join(shiftPath, 'HEAD'), 'refs/heads/main')
    console.log('Repository initialized')
}

export { initRepository }
