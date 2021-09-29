import { klona } from 'klona/json'

/**
 * Create a JsonApiForm object, decoupling the original from the mutable data.
 *
 * @type {import('..').responseToForm}
 */
export const responseToForm = response => {
	const data = {}
	const original = {}
	data[response.data.id] = response.data
	original[response.data.id] = klona(response.data)
	if (response.included) {
		for (const resource of response.included) {
			data[resource.id] = resource
			original[resource.id] = klona(resource)
		}
	}
	return { data, original, changes: {}, errors: {} }
}
