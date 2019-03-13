const path = require('path');

module.exports = {
  mode: 'development',
  // mode: 'production',
  watch: true,
  entry: {
    app: './src/index.js'
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },

  module: {
    rules: [
      {
        enforce: "pre",
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: "eslint-loader"
      },
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
};
