import { dset } from 'dset'
import dlv from 'dlv'

/**
 * Convert a JSON Pointer into a list of unescaped strings, e.g. `/foo/bar~/biz` to `['foo','bar/biz']`.
 * @type toSegments
 */
export function toSegments(path) {
	[ , ...path ] = path.split('/')
	let segments = []
	for (let segment of path) {
		// From RFC6901
		// Evaluation of each reference token begins by decoding any escaped
		// character sequence.  This is performed by first transforming any
		// occurrence of the sequence '~1' to '/', and then transforming any
		// occurrence of the sequence '~0' to '~'.  By performing the
		// substitutions in this order, an implementation avoids the error of
		// turning '~01' first into '~1' and then into '/', which would be
		// incorrect (the string '~01' correctly becomes '~1' after
		// transformation).
		segments.push(segment.replaceAll('~1', '/').replaceAll('~0', '~'))
	}
	return segments
}

/**
 * Convert a list of unescaped strings to a JSON Pointer, e.g. `['foo','bar/biz']` to `/foo/bar~/biz`.
 * @type fromSegments
 */
export function fromSegments(list) {
	let output = ''
	for (let segment of list) {
		// From RFC6901
		// Evaluation of each reference token begins by decoding any escaped
		// character sequence.  This is performed by first transforming any
		// occurrence of the sequence '~1' to '/', and then transforming any
		// occurrence of the sequence '~0' to '~'.  By performing the
		// substitutions in this order, an implementation avoids the error of
		// turning '~01' first into '~1' and then into '/', which would be
		// incorrect (the string '~01' correctly becomes '~1' after
		// transformation).
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
 * @type get
 */
export function get (obj, path) {
	return dlv(obj, makeConsistent(path))
}

/**
 * Set a deep property by JSON Pointer, or by an array of property names.
 * @type set
 */
export function set(obj, path, value) {
	dset(obj, makeConsistent(path), value)
	return obj
}

/**
 * @type unset
 */
export function unset(obj, path) {
	let segments = makeConsistent(path)
	let last = segments.pop()
	let item = dlv(obj, segments)
	item && delete item[last]
	if (Array.isArray(item)) item.splice(parseInt(last, 10), 1)
	dset(obj, segments, item)
	return obj
}
