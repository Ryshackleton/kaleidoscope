'use strict';

const path = require('path');
const webpack = require('webpack');
const WebpackNotifierPlugin = require('webpack-notifier');
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
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new WebpackNotifierPlugin({ alwaysNotify: true }),
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
      /*
      {
        test    : /\.json$/,
        loader  : 'json-loader',
        include : [
          path.resolve(__dirname, 'resources'),
        ],
      },
        */
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
        /*
      {
        test: /\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        loader: 'file-loader',
        options: {
          name: '../fonts/[name].[ext]',
        },
      },
        */
    ],
  },
};
