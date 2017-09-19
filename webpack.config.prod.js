'use strict';

const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'src/js/index.js'),
  output: {
    path     : path.resolve(__dirname, 'build'),
    filename : 'bundle.js',
  },
  devtool: 'inline-source-map',
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new webpack.optimize.UglifyJsPlugin(),
    new ExtractTextPlugin('bundle.css'), 
    new CopyWebpackPlugin([
      {
          from: path.join(__dirname, 'data'),
          to: 'data',
      },
      {
          from: 'src/index.html',
          to: 'index.html',
      }
    ])
  ],
  module: {
    rules: [
      {
        test    : /\.js/, // .js and .jsx files
        loader  : 'babel-loader',
        include : [
          path.resolve(__dirname, 'src/js'),
        ],
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
                importLoaders: 1,
              },
            },
            {
              loader: 'postcss-loader',
            },
          ],
        }),
      },
    ],
  },
};
