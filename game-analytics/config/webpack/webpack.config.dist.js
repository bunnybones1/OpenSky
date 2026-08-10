const path = require('path')
const webpack = require('webpack')
const ReplaceInFileWebpackPlugin = require('replace-in-file-webpack-plugin')

module.exports = {
  mode: 'production',
  context: process.cwd(), // to automatically find tsconfig.json
  target: 'node',
  entry: {
    main: './src/index.ts'
  },
  output: {
    path: path.join(process.cwd(), 'dist'),
    filename: 'server.js',
    publicPath: '/'
  },
  optimization: {
    // NOTE: we have to disable this as it breaks class names
    concatenateModules: true,
    // NOTE: minimization breaks discord.js dependency
    // do not enable minimization until dep is removed
    minimize: false,
    // minimizer: [
    //   new TerserPlugin({
    //     parallel: true,
    //     terserOptions: {
    //       compress: {
    //         keep_classnames: true,
    //         keep_fnames: true
    //       },
    //       mangle: {
    //         keep_classnames: true,
    //         keep_fnames: true
    //       }
    //     }
    //   })
    // ],
    runtimeChunk: false
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(false),
    new webpack.EnvironmentPlugin(['GITCOMMIT']),
    new ReplaceInFileWebpackPlugin([{
      dir: 'dist',
      files: ['server.js'],
      rules: [{
        search: 'return fetch(url',
        replace: 'return fetch.default(url' //TODO: find proper fix for es6 module issue ... 
      }]
    }])
  ],
  module: {
    rules: [
      {
        test: /.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: false
            }
          }
        ],
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.json']
  },
  // Workaround for ws module trying to require devDependencies
  externals: [
    'utf-8-validate',
    'bufferutil',
    'node-opus',
    'opusscript',
    'aws-sdk',
    'erlpack',
    'zlib-sync',
    'ffmpeg-static'
  ],
  node: {
    __dirname: false
  }
}
