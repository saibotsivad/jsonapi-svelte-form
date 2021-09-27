import _diff from 'just-diff'
const { diff } = _diff

/**
 * Given a `resourceRemove` event, update the JSON:Api Form by deleting that resource, and removing from
 * all relationships across all resources.
 *
 * @type {import('.').onRemoveResource}
 */
export function onRemoveResource (form, { detail: { id, type } }) {
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
	}

	return form
}
