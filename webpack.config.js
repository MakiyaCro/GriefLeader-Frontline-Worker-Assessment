const path = require('path');
const BundleTracker = require('webpack-bundle-tracker');

module.exports = {
  entry: path.resolve(__dirname, 'src/admin-dashboard.js'),
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'baseapp/webpack-dist'),
    clean: true,
    publicPath: '/static/webpack-dist/',  // Add this line
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      }
    ]
  },
  plugins: [
    new BundleTracker({
      path: path.resolve(__dirname, 'baseapp'),
      filename: 'webpack-stats.json'
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  }
};