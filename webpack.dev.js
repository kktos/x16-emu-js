const { merge }= require('webpack-merge');
const common= require('./webpack.common.js');

module.exports= merge(common, {
	mode: 'development',
	devtool: 'inline-source-map',
	devServer: {
		port: 3000,
		overlay: true,
		headers: {
			"Cross-Origin-Embedder-Policy": "require-corp",
			"Cross-Origin-Opener-Policy": "same-origin"
		},
	},
});
