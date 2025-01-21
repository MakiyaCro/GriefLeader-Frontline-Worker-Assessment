const path = require('path');
const BundleTracker = require('webpack-bundle-tracker');

module.exports = {
  entry: {
    main: path.resolve(__dirname, 'src/admin-dashboard.js')
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'webpack-dist'),
    clean: true,
    publicPath: '/static/webpack-dist/',  // Absolute path from domain root
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
      path: __dirname,
      filename: 'webpack-stats.json',
      publicPath: '/static/webpack-dist/'  // Added explicit publicPath in BundleTracker
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  }
};