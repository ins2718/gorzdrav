const path = require("path");

module.exports = {
    target: "node",
    mode: "development",
    entry: {
        "index": "./src/index.ts",
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
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader",
                },
            },
            {
                test: /\.node$/,
                loader: "node-loader",
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".js"],
        fallback: {},
    },
    externals: [{}], // Возможно, вам потребуется настроить externals, если у вас есть зависимости, которые не должны быть включены в бандл.
    plugins: [],
};