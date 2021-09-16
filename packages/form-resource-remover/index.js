import _diff from 'just-diff'
const { diff } = _diff

export function onRemoveResource (form, { detail: { id, type } }) {
	// TODO this removes the resource and all related, but if you delete a resource it doesn't go through and delete the relationships in *that* resource
	// TODO it probably shouldn't, it should be part of the responsibility of whoever calls this
	delete form?.data?.[id]
	for (const resourceId in (form?.data || {})) {
		const resource = form.data[resourceId]
		for (const relationshipName of Object.keys(resource?.relationships || {})) {
			const relationship = resource.relationships?.[relationshipName]
			if (Array.isArray(relationship.data)) {
				relationship.data = relationship.data.filter(r => r.id !== id || r.type !== type)
				if (!relationship.data.length) delete relationship.data
			} else if (relationship?.data?.id === id && relationship?.data?.type === type) {
				delete relationship.data
			}
			if (!relationship.data) delete resource.relationships[relationshipName]
		}
		if (!Object.keys(resource.relationships || {}).length) delete resource.relationships
	}
	form.changes = diff(form.original, form.data)
	return form
}
