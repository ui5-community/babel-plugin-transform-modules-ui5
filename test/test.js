/* global test, expect, describe */
import { writeFileSync, statSync, readdirSync, emptyDirSync, ensureDirSync } from 'fs-extra'
import { join, resolve } from 'path'
import { transformFileSync } from 'babel-core'
import { get as getOpts } from './options'
import plugin from '..'

const FXTR_DIR_NAME = 'fixtures'
const OUT_DIR_NAME = 'output'

const rootFixtureDirPath = resolve(__dirname, FXTR_DIR_NAME)

emptyDirSync(join(__dirname, OUT_DIR_NAME))

function processDirectory(dir) {
  const items = readdirSync(dir)
  // Process Files first
  items
    .filter(item => item.endsWith('.js'))
    .forEach(filename => {
      test(filename, () => {
        // console.log(`Running ${filename}`) // eslint-disable-line
        const filepath = join(dir, filename)
        const outputPath = filepath.replace(FXTR_DIR_NAME, OUT_DIR_NAME)
        try  {
          const opts = getOpts(filepath)
          const result: string = transformFileSync(filepath, {
            plugins: [
              'syntax-decorators',
              'transform-object-rest-spread',
              'syntax-class-properties',
              [plugin, opts]
            ],
            sourceRoot: (filename.includes('sourceroot') ? rootFixtureDirPath : undefined),
            babelrc: false
          }).code

          ensureDirSync(dir.replace(FXTR_DIR_NAME, OUT_DIR_NAME)) // This is delayed for when we run with a filter.
          writeFileSync(outputPath, result) // For manual verification

          if (filepath.includes('-error-')) {
            throw new Error(`Expected ${filename} to throw error`)
          }
          // if (!opts.allowMixedExports && result.includes(`"__esModule"`)) {
          //   throw new Error(`Unexpected __esModule declaration in ${filename}`)
          // }
          if (!filepath.includes('_private_')) {
            expect(result).toMatchSnapshot()
          }
        }
        catch (error) {
          if (filename.includes('error-')) {
            const message = error.message.replace(filepath, '')
            expect(message).toMatchSnapshot()
            writeFileSync(outputPath, message) // For manual verification
          }
          else {
            throw error
          }
        }
      })
    })

  // Recurse into directories
  items
    .map(name => ({ name, path: join(dir, name) }))
    .filter(item => statSync(item.path).isDirectory())
    .forEach(item => {
      describe(item.name, () => {
        processDirectory(item.path)
      })
    })
}

(() => {
  processDirectory(rootFixtureDirPath)
})()
