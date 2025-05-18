const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const path = require("path");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    static: path.resolve(__dirname, "dist"),
    open: true,
    port: 8080,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    compress: true,
    historyApiFallback: true,
  },
});
