import { GET, PUT } from './mock-api.js'
import { load, saving, saved, error } from '../src/mapper.js'

/**
 * When loading a resource, all you need is to pass the JSON:API response
 * to the `load` function.
 *
 * @param id
 * @return {Promise<JsonApiSvelteForm>}
 */
export const fetchCar = async ({ id }) => {
	const { body } = await GET(id)
	return load(body)
}

/**
 * When saving a resource, you need to hold on to the `remap` property, in case
 * the JSON:API server returns an error response.
 *
 * @param {JsonApiSvelteForm} form - The modified form.
 * @param {String} id - The resource identifier.
 * @param {Boolean} [fail] - Whether the call to save should throw the mock error or not.
 * @return {Promise<JsonApiSvelteForm|ErrorDetails>}
 */
export const saveCar = async ({ form, id, fail }) => {
	// First the form is turned into a JSON:API request, e.g. { data, included: [] }
	// as well as a mapper to map source pointers on errors back to their original.
	let { body, remap } = saving({ form, id })

	// Many HTTP request implementations will throw when a request returns
	// an error, but the MDN `fetch` specs say:
	//   > A fetch() promise does not reject on HTTP errors
	// If your implementation throws on errors, you'll have to modify this
	// to use a try/catch flow.
	const response = await PUT(body, fail)
	const json = await response.json()

	if (json.errors) {
		// If there are errors in the body, we'll throw the constructed `ErrorDetails` object, using
		// the `remap` object to connect the JSON:API index-based Pointers to the id-based ones.
		throw error({ body: json, remap })
	} else {
		// If the response was a success, we need to map that response to the JsonApiForm structure. In this
		// case there aren't any errors, so `mapper` doesn't end up getting used.
		return saved(json)
	}
}
