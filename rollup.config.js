import commonjs from '@rollup/plugin-commonjs'
import svelte from 'rollup-plugin-svelte'
import resolve from '@rollup/plugin-node-resolve'

export default {
	input: 'docs/app.js',
	output: {
		file: 'docs/build/app.js',
		format: 'iife'
	},
	plugins: [
		commonjs(),
		svelte(),
		resolve()
	]
}
