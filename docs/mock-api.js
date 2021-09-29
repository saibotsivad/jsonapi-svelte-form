import { responseToForm } from '../src/response-to-form.js'

// Here we are mocking a fetch from a JSON:API compliant server, which
// returns a JSON object in the normal structure. To turn that into
// a JsonApiForm, pass the whole response (after parsing the JSON)
// to the `responseToForm` function.
export const fetchCarFromMockApi = async () => responseToForm({
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
})
