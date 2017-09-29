/* global it, expect, afterAll */
const fse = require('fs-extra')
const Path = require('path')
const babel = require('babel-core')
const plugin = require('..')

const fixtureDirPath = Path.resolve(__dirname, "fixtures")
const resultsDir = Path.join(__dirname, "output")

fse
  .emptyDirSync(resultsDir)

fse
  .readdirSync(fixtureDirPath)
  .filter(item => item.endsWith('.js'))
  .forEach(item => {
    const filename = Path.join(fixtureDirPath, item)
    const babelOpts = {
      plugins: [
        "babel-plugin-syntax-decorators",
        "babel-plugin-syntax-class-properties",
        plugin
      ]
    }
    const result = babel.transformFileSync(filename, babelOpts).code
    it(item, () => {
      expect(result).toMatchSnapshot()
    })
  })

afterAll(() => {
  // Log the results into individual files. These are for manual spot-checking, not for automated tests.
  try {
    const sciptName = Path.basename(__filename)
    const snapshots = require(Path.join(__dirname, '__snapshots__', `${sciptName}.snap`))
    Object.keys(snapshots).forEach(item => {
      const filename = item.split('.js')[0] + '.js'
      const filepath = Path.join(resultsDir, filename)
      const escapedCode = snapshots[item]
      const plainCode = escapedCode
        .trim()
        .slice(1, -1) // Remove the surrounding quotes
        .replace(/\\"/g, '"')
      fse.writeFileSync(filepath, plainCode)
    })
  } catch (error) {
    console.error(error)
  }
})
