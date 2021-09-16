export const formFromResponse = response => {
	const data = {}
	const original = {}
	data[response.data.id] = response.data
	original[response.data.id] = JSON.parse(JSON.stringify(response.data))
	if (response.included) {
		for (const resource of response.included) {
			data[resource.id] = resource
			original[resource.id] = JSON.parse(JSON.stringify(resource))
		}
	}
	return { data, original }
}
