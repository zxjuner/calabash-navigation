const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { watchFile } = require('fs');

// 设置 nodejs 环境变量
process.env.NODE_ENV = 'development';

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'js/main.js',
        path: path.resolve(__dirname, 'build'),
        publicPath: './'
    },
    module: {
        rules: [
            {
                // 处理 scss 资源 
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'sass-loader'
                ]
            },
            {
                test: /\.css$/,
                use: [
                    // 创建 style 标签，添加样式
                    //'style-loader', 
                    // 取代 style-loader，提取 js 中的 css 成单独文件
                    MiniCssExtractPlugin.loader,
                    // 将 css 整合到 js 文件中
                    'css-loader',

                    // postcss 加载兼容性样式, 默认为生产环境
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: ['postcss-preset-env']
                            }
                        }
                    }
                ]
            },
            {
                // 处理图片资源
                test: /\.(jpg|png|gif)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'images/[name][ext]'
                }
            },
            {
                // 处理 html 中 img 资源
                test: /\.html$/,
                loader: 'html-loader',
                options: {
                    sources: {
                        list: [
                            { tag: 'img', attribute: 'src', type: 'src' }
                        ]
                    }
                }
            },
            // {
            //     test: /\.(woff(2)?|eot|ttf|otf|svg)$/, // 处理字体文件
            //     type: 'asset/resource', // 使用内置的 asset 模块
            // },
            {
                test: /\.svg$/,
                exclude: /node_modules\/bootstrap/, // 排除 Bootstrap 中的 SVG 图标
                type: 'asset/resource',
                generator: {
                    filename: 'images/[name].[hash][ext]'
                }
            },            
            {
                // 处理其他资源
                exclude: /\.(html|css|scss|js|jpg|png|gif|woff(2)?|eot|ttf|otf)$/,
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]',
                    outputPath: 'media'
                }
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html'
        }),
        new MiniCssExtractPlugin({
            filename: 'styles/calabash.built.css'
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/json', to: 'json' }
            ],
        }),
        // 清理 build 文件夹
        //new CleanWebpackPlugin()
        // 压缩 css
        // new OptimizeCssAssetsWebpackPlugin()
    ],
    optimization: {
        minimize: true,
        minimizer: [
            `...`,
            new CssMinimizerPlugin(),
        ],
    },
    mode: 'development',

    // 启动：webpack serve
    devServer: {
        static: {
            directory: path.join(__dirname, 'build'),
            publicPath: '/'
        },
        compress: true,
        port: 3000,
        open: true,
        hot: true,
        liveReload: true,
        watchFiles: ['src/**/*']
    }
};
