import { klona } from 'klona/json'
import { toForm, toRequest } from '../src/mapper.js'

// Here we are mocking a fetch from a JSON:API compliant server, which
// returns a JSON object in the normal structure. To turn that into
// a JsonApiForm, pass the whole response (after parsing the JSON)
// to the `toForm` function.
export const fetchCarFromMockApi = async () => toForm({
	body: {
		data: {
			id: '001',
			type: 'car',
			attributes: {
				color: 'red'
			},
			relationships: {
				wheels: {
					data: [
						{
							id: '002',
							type: 'wheel'
						}
					]
				}
			}
		},
		included: [
			{
				id: '002',
				type: 'wheel',
				attributes: {
					size: 'big'
				}
			}
		]
	}
})

const delay = async millis => new Promise(r => setTimeout(() => r(), millis))

const mockPostWithFail = async ({ data, included }) => new Promise((resolve, reject) => {
	// For the demo, we'll construct an array of errors, one for every object
	// on the `mapper`, as well as one extra to see how that looks.
	let mockResponse = {
		body: {
			errors: [
				{
					title: 'Unknown Error',
					detail: 'This is an error that does not have a source pointer.'
				},
				{
					title: 'Invalid Color',
					detail: 'Whatever color you put in here is invalid.',
					source: {
						// If there are pointers on the errors, they're mapped
						// to the resource by id. Since the "car" is the primary
						// resource on the request, an API returning an error
						// for the car color would look like this:
						pointer: '/data/attributes/color'
					}
				}
			]
		}
	}
	let index = 0
	for (let resource of (included || [])) {
		let propName
		if (resource.type === 'car') propName = 'color'
		if (resource.type === 'wheel') propName = 'size'
		if (resource.type === 'position') propName = 'position'
		mockResponse.body.errors.push({
			title: 'Error for a resource.',
			detail: `There was an error for id=${resource.id}`,
			source: {
				pointer: `/included/${index++}/attributes/${propName}`
			}
		})
	}
	reject(mockResponse)
})

const mockPost = async (body, fail) => {
	await delay(1200)
	return fail
		? mockPostWithFail(body)
		: klona({ body })
}

export const saveCarToMockApi = async ({ form, id, fail }) => {
	// First the form is turned into a JSON:API request, e.g. { data, included: [] }
	// as well as a mapper to map source pointers on errors back to their original.
	let { body, mapper } = toRequest({ form, id })
	// (Your fetch implementation might not throw on 400+ responses, but it's a
	// pretty common pattern, and assumed here.)
	try {
		const response = await mockPost(body, fail)
		// Finally, we need to map that response to the JsonApiForm structure. In this
		// case there aren't any errors, so `mapper` doesn't end up getting used.
		return toForm({ body: response.body, state: 'saved' })
	} catch (errorResponse) {
		// In this case, the body has a JSON:API errors list at the root, so we
		// combine that with the mapper to generate the form.
		throw toForm({ mapper, body: errorResponse.body, state: 'error' })
	}
}
