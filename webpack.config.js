const path = require('path');

module.exports = {
  entry: './artifacts/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },


  devServer: {
    contentBase: path.join(__dirname, 'static'),
    compress: true,
    port: 8081
  }


};
