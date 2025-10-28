const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
    target: "node",
    mode: "development",
    entry: {
        "content-script": "./src/content-script.ts",
    },
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "[name].js",
        clean: true,
    },
    devtool: "source-map",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader",
                },
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            }
        ],
    },
    resolve: {
        extensions: [".ts", ".js", ".tsx"],
        fallback: {},
    },
    externals: [{}], // Возможно, вам потребуется настроить externals, если у вас есть зависимости, которые не должны быть включены в бандл.
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: "public", to: "." }
            ],
        }),
    ]
};