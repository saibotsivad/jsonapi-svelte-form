<script>
	import { createEventDispatcher } from 'svelte'
	import _diff from 'just-diff'
	const { diff } = _diff

	export let form
	export let startingCount = 0
	export let prefix = 'GID'

	let count = startingCount

	const makeDiff = (form, id) => {
		form.changes[id] = diff(form.original[id] || {}, form.data[id] || {})
		if (!form.changes[id].length) delete form.changes[id]
	}

	const dispatch = createEventDispatcher()

	const remove = ({ id, type }) => {
		delete form.data[id]
		makeDiff(form, id)

		for (let resourceId in form.data) {
			let touched
			let resource = form.data[resourceId]
			for (let relName of Object.keys(resource.relationships || {})) {
				const rel = resource.relationships[relName]
				if (Array.isArray(rel.data)) {
					let filtered = rel.data.filter(r => r.id !== id || r.type !== type)
					if (filtered.length !== rel.data.length) {
						form.data[resourceId].relationships[relName].data = filtered
						if (!rel.data.length) delete form.data[resourceId].relationships[relName].data
						touched = true
					}
				} else if (rel?.data?.id === id && rel?.data?.type === type) {
					delete form.data[resourceId].relationships[relName].data
					touched = true
				}
				if (!rel.data) {
					delete form.data[resourceId].relationships[relName]
					touched = true
				}
			}
			if (!Object.keys(resource.relationships || {}).length) {
				delete form.data[resourceId].relationships
				touched = true
			}
			if (touched) makeDiff(form, resourceId)
		}
		dispatch('remove', { id, type })
	}

	const create = ({ relId, relName, isArray, type }) => {
		let id = `${prefix}${++count}`
		form.data[id] = { type, id }
		makeDiff(form, id)

		if (!form.data[relId].relationships) form.data[relId].relationships = {}
		if (!form.data[relId].relationships[relName]) form.data[relId].relationships[relName] = {}
		if (isArray) {
			let data = form.data[relId].relationships[relName].data || []
			data.push({ type, id })
			form.data[relId].relationships[relName].data = data
		} else {
			form.data[relId].relationships[relName].date = { type, id }
		}
		makeDiff(form, relId)
		dispatch('create', { relId, relName, isArray, type })
	}
</script>

<slot {create} {remove} />
