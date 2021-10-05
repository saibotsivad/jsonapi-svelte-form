<script>
	import MakeDiff from './MakeDiff.svelte'
	import { createEventDispatcher } from 'svelte'

	export let form

	const dispatch = createEventDispatcher()

	/**
	 * Remove a resource from the Form.
	 *
	 * @type {import('..').remove}
	 */
	const remove = makeDiff => ({ id, type }) => {
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
</script>

<MakeDiff let:makeDiff>
	<slot remove={remove(makeDiff)} />
</MakeDiff>
