import { get, set, toTokens } from 'pointer-props'
import { klona } from 'klona/json'

/**
 * Create a JsonApiForm object, decoupling the original from the mutable data.
 *
 * @type {import('..').toForm}
 */
export const toForm = response => {
	let { body, mapper, state = 'start' } = response || {}
	body = body || {}

	let errors
	if (body.errors && mapper) {
		errors = { mapped: {}, other: [] }
		for (let error of body.errors) {
			let pointer = error.source?.pointer
			if (pointer) {
				pointer = toTokens(pointer)
				let [ p0, p1, ...p ] = pointer
				if (p0 !== 'data' && p0 !== 'included') {
					// this is an incorrectly formatted pointer
					errors.other.push(error)
				} else {
					let mapperKey = p0 === 'data'
						? 'data'
						: p1
					let tokens = p0 === 'data'
						? [ p1, ...p ]
						: p
					let accessor = [ mapper[mapperKey], ...tokens ]
					let pointerErrors = get(errors.mapped, accessor) || []
					pointerErrors.push(error)
					set(errors.mapped, accessor, pointerErrors)
				}
			} else {
				errors.other.push(error)
			}
		}
		if (!Object.keys(errors.mapped).length) delete errors.mapped
		if (!errors.other.length) delete errors.other
	}
	if (errors && Object.keys(errors).length) return { errors, state: 'error' }

	let data = {}
	let original = {}
	let put = resource => {
		data[resource.id] = resource
		original[resource.id] = klona(resource)
	}
	let all = [
		...(
			Array.isArray(body.data)
				? body.data
				: [ body.data ]
		),
		...(body.included || [])
	].filter(Boolean)
	for (let resource of all) put(resource)

	return {
		data,
		original,
		state,
		changes: {},
	}
}

/**
 *
 * @type {import('..').toRequest}
 */
export const toRequest = ({ form, id }) => {
	let mapper = {
		data: id
	}
	let index = 0
	let included = []
	for (let resourceId in form.data || []) {
		if (resourceId !== id) {
			included.push(form.data[resourceId])
			mapper[index++] = resourceId
		}
	}
	return {
		mapper,
		body: {
			data: form.data[id],
			included: included.length ? included : undefined,
		}
	}
}
