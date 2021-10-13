const transformUI5 = require("@dx4babel/babel-plugin-transform-modules-ui5");

module.exports = (context, opts = {}) => ({
  plugins: [[transformUI5, opts]],
});
