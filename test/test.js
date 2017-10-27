/* global test, expect */
const fse = require('fs-extra')
const Path = require('path')
const babel = require('babel-core')
const plugin = require('..')

const fixtureDirPath = Path.resolve(__dirname, 'fixtures')
const outputDir = Path.join(__dirname, 'output')

fse
  .emptyDirSync(outputDir)

fse
  .readdirSync(fixtureDirPath)
  .filter(item => item.endsWith('.js'))
  .forEach(filename => {
    test(filename, () => {
      console.log(`Running ${filename}`) // eslint-disable-line
      const filepath = Path.join(fixtureDirPath, filename)
      const result = babel.transformFileSync(filepath, {
        plugins: [
          'babel-plugin-syntax-decorators',
          'babel-plugin-syntax-class-properties',
          plugin
        ]
      }).code
      fse.writeFileSync(Path.join(outputDir, filename), result) // For manual verification
      // expect(result).toMatchSnapshot()
    })
  })
