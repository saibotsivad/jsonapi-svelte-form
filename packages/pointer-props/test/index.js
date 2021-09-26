import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { toSegments, fromSegments, get, set, unset } from '../index.js'

test('toSegments', () => {
	assert.equal(
		toSegments('/foo/3/bar'),
		[ 'foo', '3', 'bar' ],
		'basic pointers'
	)
	assert.equal(
		toSegments('/f~1o~1o/b~0a~0r'),
		[ 'f/o/o', 'b~a~r' ],
		'encoded characters'
	)
})

test('fromSegments', () => {
	assert.equal(
		fromSegments([ 'foo', 3, 'bar' ]),
		'/foo/3/bar',
		'basic pointers'
	)
	assert.equal(
		fromSegments([ 'f/o/o', 'b~a~r' ]),
		'/f~1o~1o/b~0a~0r',
		'encoded characters'
	)
})

test('get', () => {
	assert.equal(
		get({ foo: { bar: 'baz' } }, '/foo/bar'),
		'baz',
		'basic pointer access'
	)
	assert.equal(
		get({ foo: { bar: 'baz' } }, [ 'foo', 'bar' ]),
		'baz',
		'array access is okay'
	)
	assert.equal(
		get({ 'f/o/o': { 'b~a~r': 'baz' } }, '/f~1o~1o/b~0a~0r'),
		'baz',
		'encoded characters'
	)
})

test('set', () => {
	assert.equal(
		set({ foo: { bar: 'baz' } }, '/foo/bar', 'fizz').foo.bar,
		'fizz',
		'basic pointer access'
	)
	assert.equal(
		set({ foo: { bar: 'baz' } }, [ 'foo', 'bar' ], 'fizz').foo.bar,
		'fizz',
		'array access is okay'
	)
	assert.equal(
		set({ 'f/o/o': { 'b~a~r': 'baz' } }, '/f~1o~1o/b~0a~0r', 'fizz')['f/o/o']['b~a~r'],
		'fizz',
		'encoded characters'
	)
})

test('unset', () => {
	assert.equal(
		unset({ foo: { bar: 'baz' } }, '/foo/bar').foo.bar,
		undefined,
		'basic pointer access'
	)
	assert.equal(
		unset({ foo: { bar: 'baz' } }, [ 'foo', 'bar' ]).foo.bar,
		undefined,
		'array access is okay'
	)
	assert.equal(
		unset({ 'f/o/o': { 'b~a~r': 'baz' } }, '/f~1o~1o/b~0a~0r')['f/o/o']['b~a~r'],
		undefined,
		'encoded characters'
	)
	assert.equal(
		unset({ foo: [ 'a', 'b', 'c' ]}, '/foo/1').foo,
		[ 'a', 'c' ],
		'array by index does not leave holes'
	)
})

test.run()
