import commonjs from '@rollup/plugin-commonjs'
import svelte from 'rollup-plugin-svelte'
import resolve from '@rollup/plugin-node-resolve'
import npmRun from 'rollup-plugin-npm-run'

const watch = process.env.ROLLUP_WATCH

export default [
	{
		input: 'lib/mapper.js',
		output: [
			{
				file: 'dist/mapper.mjs',
				format: 'es'
			},
			{
				file: 'dist/mapper.js',
				format: 'cjs'
			},
		],
		external: [
			'klona/json',
			'pointer-props'
		]
	},
	{
		input: 'src/index.js',
		output: [
			{
				file: 'dist/index.mjs',
				format: 'es'
			},
			{
				file: 'dist/index.js',
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
