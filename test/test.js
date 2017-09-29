/* global it, expect */
const fse = require('fs-extra')
const Path = require('path')
const babel = require('babel-core')
const plugin = require('..')

const fixtureDirPath = Path.resolve(__dirname, 'fixtures')
const resultsDir = Path.join(__dirname, 'output')

fse
  .emptyDirSync(resultsDir)

fse
  .readdirSync(fixtureDirPath)
  .filter(item => item.endsWith('.js'))
  .forEach(filename => {
    it(filename, () => {
      console.log(`Running ${filename}`)
      const filepath = Path.join(fixtureDirPath, filename)
      const babelOpts = {
        plugins: [
          'babel-plugin-syntax-decorators',
          'babel-plugin-syntax-class-properties',
          plugin
        ]
      }
      const result = babel.transformFileSync(filepath, babelOpts).code
      const resultFilepath = Path.join(resultsDir, filename)
      fse.writeFileSync(resultFilepath, result)
      expect(result).toMatchSnapshot()
    })
  })
