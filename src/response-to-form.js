import { klona } from 'klona/json'

/**
 * Create a JsonApiForm object, decoupling the original from the mutable data.
 *
 * @type {import('..').responseToForm}
 */
export const responseToForm = response => {
	response = response || {}
	const data = {}
	const original = {}
	const set = resource => {
		data[resource.id] = resource
		original[resource.id] = klona(resource)
	}
	let all = [
		...(
			Array.isArray(response.data)
				? response.data
				: [ response.data ]
		),
		...(response.included || [])
	].filter(Boolean)
	for (let resource of all) set(resource)
	return { data, original, changes: {}, errors: {} }
}
