import transformUI5 from "babel-plugin-transform-modules-ui5";

export default (context, opts = {}) => ({
  plugins: [[transformUI5, opts]],
});
