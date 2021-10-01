import { klona } from 'klona/json'
import { get, set, toTokens } from 'pointer-props'

/**
 * Given a normal response from a JSON:API server, create a JsonApiForm in the
 * loaded state.
 *
 * @type {import('..').load}
 */
export const load = body => {
	body = body || {}
	let output = {
		data: {},
		original: {},
		changes: {},
		state: 'loaded'
	}
	let put = resource => {
		output.data[resource.id] = resource
		output.original[resource.id] = klona(resource)
	}
	for (let resource of (body.included || [])) put(resource)
	if (Array.isArray(body.data)) for (let resource of body.data) put(resource)
	else if (body.data) {
		put(body.data)
		output.primaryId = body.data.id
	}
	return output
}

/**
 * Given a JsonApiForm, create a JSON:API request with `data` and `included` (if set
 * on the form), as well as an object to map errors returned from the server.
 *
 * The mapper is needed so that the JsonApiForm, which is an id-mapped object, can
 * be connected to the JSON:API request's `included` property, which is an array.
 * The map object connects the index to the resource identifier, which is used for
 * mapping errors which contain a JSON Pointer.
 *
 * @type {import('..').saving}
 */
export const saving = form => {
	let remap = { data: form.primaryId }
	let included = []
	let index = 0
	for (let resourceId in form.data) {
		if (resourceId !== form.primaryId) {
			included.push(form.data[resourceId])
			remap[index++] = resourceId
		}
	}
	let body = { data: form.data[form.primaryId] }
	if (included.length) body.included = included
	return { remap, body }
}

/**
 * After a JSON:API save request is completed, if there are no errors, this will transition
 * the form to the saved state.
 *
 * @type {import('..').saved}
 */
export const saved = (body) => {
	const form = load(body)
	form.primaryId = body.data.id
	form.state = 'saved'
	return form
}

const add = (obj, keypath, value) => {
	let list = get(obj, keypath) || []
	list.push(value)
	set(obj, keypath, list)
}

/**
 * Given a JSON:API error response, combine it with a remap object to create an error
 * object which has a map of JSON Pointer paths to errors, and a list of errors that
 * are not mapped with Pointer paths.
 *
 * @type {import('..').error}
 */
export const error = ({ body, remap }) => {
	let errors = { mapped: {}, other: [] }
	for (let error of (body.errors || [])) {
		let pointer = error.source?.pointer
		if (pointer) {
			pointer = toTokens(pointer)
			let [ p0, p1, ...p ] = pointer
			if (p0 === 'data') {
				add(errors.mapped, [ remap.data, p1, ...p ], error)
			} else if (p0 === 'included') {
				add(errors.mapped, [ remap[p1], ...p ], error)
			} else {
				errors.other.push(error)
			}
		} else {
			errors.other.push(error)
		}
	}
	if (!Object.keys(errors.mapped).length) delete errors.mapped
	if (!errors.other.length) delete errors.other
	return {
		errors,
		state: 'error'
	}
}
