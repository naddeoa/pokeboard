const path = require('path')

module.exports = {
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },

    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            { test: /\.tsx?$/, loader: 'ts-loader' },
        ],
    },

    devServer: {
        contentBase: path.join(__dirname, 'static'),
        compress: true,
        port: 8081,
        host: '0.0.0.0'
    },
}
