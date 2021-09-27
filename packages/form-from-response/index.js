const copy = input => JSON.parse(JSON.stringify(input))

/**
 * Create a JSON:API Form object, decoupling the original from the mutable data.
 *
 * @type {import('.').formFromResponse}
 */
export const formFromResponse = response => {
	const data = {}
	const original = {}
	data[response.data.id] = response.data
	original[response.data.id] = copy(response.data)
	if (response.included) {
		for (const resource of response.included) {
			data[resource.id] = resource
			original[resource.id] = copy(resource)
		}
	}
	return { data, original, changes: {} }
}
