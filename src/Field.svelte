<script>
	import { createEventDispatcher } from 'svelte'
	import { get, toTokens } from 'pointer-props'
	import debounce from 'just-debounce-it'
	import _diff from 'just-diff'
	const { diff } = _diff

	/** @type {import('..').JsonApiForm} */
	export let form
	/** @type string */
	export let id
	/**
	 * Note that the keypath array can only be up to 6 tokens in length, e.g. "/1/2/3/4/5/6"
	 * is the most that can be handled.
	 * @type {string|Array<string>}
	 * */
	export let keypath
	/** @type {number|undefined} */
	export let debounceMillis

	$: tokens = keypath.split ? toTokens(keypath) : keypath
	$: value = get(form.data[id], tokens) || ''
	$: errors = get(form, [ 'errors', 'mapped', id, ...tokens ]) || []

	/*
	Because the diff calculation is expensive, we debounce so that e.g. entering text
	rapidly won't cause a sudden pile of blocking diff calculations to slow the UI.
	 */
	const dispatch = createEventDispatcher()
	const change = debounce(
		(updatedValue) => {
			form.changes[id] = diff(form.original[id] || {}, form.data[id] || {})
			if (!form.changes[id].length) delete form.changes[id]
			if (Object.keys(form.changes).length) form.state = 'unsaved'
			else form.state = 'unchanged'
			dispatch('change', { id, keypath: tokens, value: updatedValue })
		},
		debounceMillis || 15,
		true
	)

	/**
	 * Set the value back to the form.
	 * @param {any} v - The value to set.
	 */
	export const set = v => {
		let [ k1, k2, k3, k4, k5, k6 ] = tokens
		let l = tokens.length
		/*
		The Svelte compiler looks for reassignment as the method to detect whether a
		function inside a component is modifying a bound value. Because of this, the
		reassignment process can't use the normal shortcut found in e.g. @lukeed/dset,
		thus the following method which is limited in depth.
		 */
		l > 0 && (form.data[id][k1] ?? (form.data[id][k1] = {}))
		l > 1 && (form.data[id][k1][k2] ?? (form.data[id][k1][k2] = {}))
		l > 2 && (form.data[id][k1][k2][k3] ?? (form.data[id][k1][k2][k3] = {}))
		l > 3 && (form.data[id][k1][k2][k3][k4] ?? (form.data[id][k1][k2][k3][k4] = {}))
		l > 4 && (form.data[id][k1][k2][k3][k4][k5] ?? (form.data[id][k1][k2][k3][k4][k5] = {}))
		l > 5 && (form.data[id][k1][k2][k3][k4][k5][k6] ?? (form.data[id][k1][k2][k3][k4][k5][k6] = {}))
		if (l === 1) form.data[id][k1] = v
		if (l === 2) form.data[id][k1][k2] = v
		if (l === 3) form.data[id][k1][k2][k3] = v
		if (l === 4) form.data[id][k1][k2][k3][k4] = v
		if (l === 5) form.data[id][k1][k2][k3][k4][k5] = v
		if (l === 6) form.data[id][k1][k2][k3][k4][k5][k6] = v
		change(v)
	}
</script>

<slot {value} {set} {errors} />
