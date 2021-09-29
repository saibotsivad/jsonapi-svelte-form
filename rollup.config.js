import commonjs from '@rollup/plugin-commonjs'
import svelte from 'rollup-plugin-svelte'
import resolve from '@rollup/plugin-node-resolve'
import npmRun from 'rollup-plugin-npm-run'

const watch = process.env.ROLLUP_WATCH

export default [
	{
		input: 'src/response-to-form.js',
		output: [
			{
				file: 'dist/response-to-form.js',
				format: 'es'
			},
			{
				file: 'dist/response-to-form.cjs',
				format: 'cjs'
			},
		],
		external: [
			'klona/json'
		]
	},
	{
		input: 'src/index.js',
		output: [
			{
				file: 'dist/index.js',
				format: 'es'
			},
			{
				file: 'dist/index.cjs',
				format: 'cjs'
			},
		],
		plugins: [
			commonjs(),
			svelte(),
			resolve()
		]
	},
	{
		input: 'docs/app.js',
		output: {
			file: 'docs/build/app.js',
			format: 'iife'
		},
		plugins: [
			commonjs(),
			svelte(),
			resolve(),
			watch && npmRun('serve')
		]
	},
]
