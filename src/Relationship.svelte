<script>
	import { get } from 'pointer-props'
	import { createEventDispatcher } from 'svelte'
	import FieldSetter from './FieldSetter.svelte'
	import FormCreate from './FormCreate.svelte'
	import MakeDiff from './MakeDiff.svelte'

	/** @type {import('..').JsonApiSvelteForm} */
	export let form
	/** @type string */
	export let id
	/**
	 * This is the name of the relationship, e.g. for `relationships.cars` it would be "cars".
	 * @type {string}
	 * */
	export let name
	/**
	 * The type of the relationship.
	 * @type {string}
	 */
	export let type
	/**
	 * If the relationship is an array, you can add or remove relationships as well.
	 * @type {boolean}
	 */
	export let isArray
	/** @type {number|undefined} */
	export let debounceMillis

	$: tokens = [ 'relationships', name, 'data' ]
	$: value = get(form.data[id], tokens) || ''
	$: errors = get(form, [ 'errors', 'mapped', id, ...tokens ]) || []
	$: disabled = !form.state || [ 'saving', 'loading' ].includes(form.state)

	let preUpdate = arrayOps => {
		if (isArray && !arrayOps || !isArray && arrayOps) {
			form.errors = form.errors || { other: [], mapped: {} }
			form.errors.other = form.errors.other || []
			form.errors.other.push({
				code: 'Incorrectly Designed Form',
				detail: `"Relationship" component attempted "onSet" but was configured as an array. [id=${id},name=${name}]`,
				meta: { formErrorId: id }
			})
			return true
		} else {
			if (!form.data[id]?.relationships) form.data[id].relationships = {}
			if (!form.data[id]?.relationships[name]) form.data[id].relationships[name] = {}
			if (!form.data[id]?.relationships[name].data) form.data[id].relationships[name].data = isArray ? [] : {}
		}
	}
	let cleanup = () => {
		if (form.data[id]?.relationships[name]?.data?.length === 0 || !form.data[id]?.relationships[name]?.data) delete form.data[id].relationships[name]
		if (Object.keys(form.data[id]?.relationships).length === 0) delete form.data[id].relationships
	}

	const dispatch = createEventDispatcher()
	let onSet = (value, makeDiff) => {
		if (value) {
			preUpdate()
			form.data[id].relationships[name] = { data: { id: value, type } }
		} else if (form.data[id].relationships[name]) {
			form.data[id].relationships[name] = undefined
		}
		cleanup()
		makeDiff(form, id)
		dispatch('change', { id, keypath: tokens, value: value })
	}
	let onAdd = (value, makeDiff) => {
		preUpdate(true)
		form.data[id].relationships[name].data = [ ...form.data[id].relationships[name].data, { id: value, type } ]
		makeDiff(form, id)
	}
	let onRemove = (value, makeDiff) => {
		preUpdate(true)
		form.data[id].relationships[name].data = [
			...form.data[id].relationships[name].data.filter(rel => !(rel.id === value && rel.type === type))
		]
		cleanup()
		makeDiff(form, id)
	}
</script>

<MakeDiff let:makeDiff>
	<FormCreate bind:form let:create>
		<FieldSetter bind:form {id} {tokens} {debounceMillis} let:set>
			<slot
				{create}
				set={value => onSet(value, makeDiff)}
				add={value => onAdd(value, makeDiff)}
				remove={value => onRemove(value, makeDiff)}
				{value}
				{errors}
				{disabled}
			/>
		</FieldSetter>
	</FormCreate>
</MakeDiff>
