<script>
	import MakeDiff from './MakeDiff.svelte'
	import { createEventDispatcher } from 'svelte'

	export let form

	const dispatch = createEventDispatcher()

	/**
	 * Create a new resource in the Form, with a generated identifier.
	 *
	 * @type {import('..').create}
	 */
	const create = makeDiff => ({ relId, relName, isArray, type, resource }) => {
		if (!form.gidIndex) form.gidIndex = 0
		let id = `${form.gidPrefix || 'GID'}${++form.gidIndex}${form.gidSuffix || ''}`
		form.data[id] = { type, id }
		makeDiff(form, id)

		if (!form.data[relId].relationships) form.data[relId].relationships = {}
		if (!form.data[relId].relationships[relName]) form.data[relId].relationships[relName] = {}
		if (isArray) {
			let data = form.data[relId].relationships[relName].data || []
			data.push({ type, id })
			form.data[relId].relationships[relName].data = data
		} else {
			form.data[relId].relationships[relName].data = { ...resource, type, id }
		}
		makeDiff(form, relId)
		dispatch('create', { relId, relName, isArray, type })
	}
</script>

<MakeDiff let:makeDiff>
	<slot create={create(makeDiff)} />
</MakeDiff>
