import { klona } from 'klona/json'

const delay = async millis => new Promise(r => setTimeout(() => r(), millis))
const json = data => ({ json: async () => data })

// Here we are mocking a fetch from a JSON:API compliant server, which
// returns a JSON object in the normal structure.
export const GET = async id => delay(1200)
	.then(() => ({
		data: {
			id,
			type: 'car',
			attributes: {
				color: 'red'
			},
			relationships: {
				wheels: {
					data: [
						{
							id: `${id}w`,
							type: 'wheel'
						}
					]
				}
			}
		},
		included: [
			{
				id: `${id}w`,
				type: 'wheel',
				attributes: {
					size: 'big'
				}
			}
		]
	}))
	.then(json)

const mockPostWithFail = ({ included }) => {
	// For the demo, we'll construct an array of errors, one for every object
	// on the `mapper`, as well as one extra to see how that looks.
	let mockResponse = {
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
	let index = 0
	for (let resource of (included || [])) {
		let propName
		if (resource.type === 'car') propName = 'color'
		if (resource.type === 'wheel') propName = 'size'
		if (resource.type === 'position') propName = 'position'
		mockResponse.errors.push({
			title: 'Error for a resource.',
			detail: `There was an error for id=${resource.id}`,
			source: {
				pointer: `/included/${index++}/attributes/${propName}`
			}
		})
	}
	return mockResponse
}

export const PUT = async (body, fail) => {
	await delay(1200)
	return json(
		fail
			? mockPostWithFail(body)
			: klona(body)
	)
}
