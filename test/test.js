/* global test, expect, describe */
const fse = require('fs-extra')
const Path = require('path')
const babel = require('babel-core')
const plugin = require('..')

const outputDir = Path.join(__dirname, 'output')
fse.emptyDirSync(outputDir)

const sourceRootOverride = Path.join(process.cwd(), 'test', 'fixtures')

function main() {
  const fixtureDirPath = Path.resolve(__dirname, 'fixtures')
  processDirectory(fixtureDirPath)
}

function processDirectory(dir) {
  const items = fse.readdirSync(dir)
  // Process Files first
  items
    .filter(item => item.endsWith('.js'))
    .forEach(filename => {
      test(filename, () => {
        console.log(`Running ${filename}`) // eslint-disable-line
        const filepath = Path.join(dir, filename)
        try  {
          const result = babel.transformFileSync(filepath, {
            plugins: [
              'syntax-decorators',
              'transform-object-rest-spread',
              'syntax-class-properties',
              [plugin, {
                namespacePrefix: (filename.includes('prefixed') ? 'prefix' : undefined),
                allowUnsafeMixedExports: false,
                noExportCollapse: false,
                noExportExtend: false,
                noImportInteroptPrefixes: ['sap/'],
                hello: 'world'
              }]
            ],
            sourceRoot: (filename.includes('sourceroot') ? sourceRootOverride : undefined),
            babelrc: false
          }).code
          fse.writeFileSync(Path.join(outputDir, filename), result) // For manual verification
          if (!filepath.includes('_private_')) {
            expect(result).toMatchSnapshot()
          }
        }
        catch (error) {
          if (filename.includes('-error-')) {
            const message = error.message.replace(filepath, '')
            expect(message).toMatchSnapshot()
            fse.writeFileSync(Path.join(outputDir, filename), message) // For manual verification
          }
          else {
            throw error
          }
        }
      })
    })

  // Recurse into directories
  items
    .map(name => {
      const path = Path.join(dir, name)
      return {
        name,
        path,
        stat: fse.statSync(path)
      }
    })
    .filter(item => item.stat.isDirectory())
    .forEach((item) => {
      describe(item.name, () => {
        processDirectory(item.path)
      })
    })
}

main()
