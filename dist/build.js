const { get, set, del } = require('pointer-props')
const _diff = require('just-diff')
const { diff } = _diff

const copy = input => JSON.parse(JSON.stringify(input))

/**
 * Create a JSON:API Form object, decoupling the original from the mutable data.
 *
 * @type {import('..').formFromResponse}
 */
const formFromResponse = response => {
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

/**
 * Handle formChange events emitted by JSON:API Forms by updating the form and calculating changes.
 *
 * @type {import('..').onFormChange}
 */
const onFormChange = (form, { detail: { id, keypath, value } }) => {
	const changeKey = [ 'data', id, ...keypath ]
	if (value !== undefined) {
		set(form, changeKey, value)
	} else {
		del(form, changeKey)
	}
	form.changes[id] = diff(form.original[id] || {}, form.data[id] || {})
	return form
}

/**
 * Given a `resourceCreate` event, update the JSON:Api Form with a resource containing an auto-generated
 * identifier, and adds the form relationship to the defined path.
 *
 * @type {import('..').resourceCreator}
 */
const resourceCreator = (startingCount = 0) => {
	let count = startingCount
	return (form, { detail: { relatedId, relatedName, isArray, type } }) => {
		let id = `GID${++count}`
		form.data[id] = { type, id }
		let relatedKeypath = [ relatedId, 'relationships', relatedName, 'data' ]
		set(
			form.data,
			relatedKeypath,
			isArray
				? [ ...(get(form.data, relatedKeypath) || []), { type, id } ]
				: { type, id }
		)
		form.changes[id] = diff({}, form.data[id])
		if (!form.changes[id].length) delete form.changes[id]
		return form
	}
}

/**
 * Given a `resourceRemove` event, update the JSON:Api Form by deleting that resource, and removing from
 * all relationships across all resources.
 *
 * @type {import('..').removeResource}
 */
function removeResource (form, { detail: { id, type } }) {
	delete form.data[id]
	form.changes[id] = diff(form.original[id] || {}, form.data[id] || {})

	for (let resourceId in (form.data)) {
		let resource = form.data[resourceId]
		for (let relationshipName of Object.keys(resource.relationships || {})) {
			const relationship = resource.relationships[relationshipName]
			if (Array.isArray(relationship.data)) {
				relationship.data = relationship.data.filter(r => r.id !== id || r.type !== type)
				if (!relationship.data.length) delete relationship.data
			} else if (relationship?.data?.id === id && relationship?.data?.type === type) {
				delete relationship.data
			}
			if (!relationship.data) delete resource.relationships[relationshipName]
		}
		if (!Object.keys(resource.relationships || {}).length) delete resource.relationships

		// Note: this could probably be optimized, to only check for diffs on the items that had
		// their relationships changed.
		form.changes[resourceId] = diff(form.original[resourceId] || {}, form.data[resourceId] || {})
		if (!form.changes[resourceId].length) delete form.changes[resourceId]
	}

	return form
}

exports.formFromResponse = formFromResponse;
exports.onFormChange = onFormChange;
exports.removeResource = removeResource;
exports.resourceCreator = resourceCreator;