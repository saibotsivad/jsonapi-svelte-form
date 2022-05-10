import commonjs from '@rollup/plugin-commonjs'
import svelte from 'rollup-plugin-svelte'
import resolve from '@rollup/plugin-node-resolve'
import npmRun from 'rollup-plugin-npm-run'
import { terser } from 'rollup-plugin-terser'

const watch = process.env.ROLLUP_WATCH

export default [
	{
		input: 'lib/mapper.js',
		output: [
			{
				file: 'dist/mapper.mjs',
				format: 'es',
			},
			{
				file: 'dist/mapper.cjs',
				format: 'cjs',
			},
		],
		external: [
			'klona/json',
			'pointer-props',
		],
	},
	{
		input: 'lib/mapper.js',
		output: {
			file: 'dist/mapper.unpkg.js',
			format: 'umd',
			name: 'JsonapiSvelteFormMapper',
		},
		plugins: [
			commonjs(),
			resolve(),
			terser(),
		],
	},
	{
		input: 'src/index.js',
		output: [
			{
				file: 'dist/index.mjs',
				format: 'es',
			},
			{
				file: 'dist/index.cjs',
				format: 'cjs',
			},
		],
		plugins: [
			commonjs(),
			svelte(),
			resolve(),
		],
	},
	{
		input: 'src/index.js',
		output: {
			file: 'dist/index.unpkg.js',
			format: 'umd',
			name: 'JsonapiSvelteForm',
		},
		plugins: [
			commonjs(),
			svelte(),
			resolve(),
			terser(),
		],
	},
	{
		input: 'docs/app.js',
		output: {
			file: 'docs/build/app.js',
			format: 'iife',
		},
		plugins: [
			commonjs(),
			svelte(),
			resolve(),
			watch && npmRun('serve'),
		],
	},
]
