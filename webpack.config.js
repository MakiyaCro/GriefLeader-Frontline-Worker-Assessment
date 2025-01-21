const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'src/admin-dashboard.js'),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'baseapp/static/js'),
    clean: true,
    publicPath: '/static/js/'
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
  resolve: {
    extensions: ['.js', '.jsx']
  }
};