import { dset } from 'dset'
import dlv from 'dlv'

/*

Note on escaping order, from RFC6901:

> Evaluation of each reference token begins by decoding any escaped
> character sequence.  This is performed by first transforming any
> occurrence of the sequence '~1' to '/', and then transforming any
> occurrence of the sequence '~0' to '~'.  By performing the
> substitutions in this order, an implementation avoids the error of
> turning '~01' first into '~1' and then into '/', which would be
> incorrect (the string '~01' correctly becomes '~1' after
> transformation).

*/

/**
 * Convert a JSON Pointer into a list of unescaped strings, e.g. `/foo/bar~1biz` to `['foo','bar/biz']`.
 * @type {import("./index").toSegments}
 */
export const toSegments = function (path) {
	[ , ...path ] = path.split('/')
	let segments = []
	for (let segment of path) {
		segments.push(segment.replaceAll('~1', '/').replaceAll('~0', '~'))
	}
	return segments
}

/**
 * Convert a list of unescaped strings to a JSON Pointer, e.g. `['foo','bar/biz']` to `/foo/bar~1biz`.
 *  @type {import("./index").fromSegments}
 */
export const fromSegments = function (list) {
	let output = ''
	for (let segment of list) {
		output += '/' + segment.toString().replaceAll('~', '~0').replaceAll('/', '~1')
	}
	return output
}

/**
 * @param {String|Array<String>} input
 * @returns {Array<String>}
 */
const makeConsistent = input => input.split ? toSegments(input) : input

/**
 * Access a property by JSON Pointer, or by an array of property names.
 * @type {import("./index").get}
 */
export const get = function (obj, path) {
	return dlv(obj, makeConsistent(path))
}

/**
 * Set a deep property by JSON Pointer, or by an array of property names.
 * @type {import("./index").set}
 */
export function set(obj, path, value) {
	dset(obj, makeConsistent(path), value)
	return obj
}

/**
 * Remove a deep property by JSON Pointer, or by an array of property names.
 * @type {import("./index").unset}
 */
export function unset(obj, path) {
	let segments = makeConsistent(path)
	let last = segments.pop()
	let item = dlv(obj, segments)
	if (Array.isArray(item)) item.splice(parseInt(last, 10), 1)
	else if (item) delete item[last]
	dset(obj, segments, item)
	return obj
}
