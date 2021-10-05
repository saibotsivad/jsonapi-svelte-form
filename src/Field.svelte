<script>
	import { get, toTokens } from 'pointer-props'
	import FieldSetter from './FieldSetter.svelte'
	import FormCreate from './FormCreate.svelte'

	/** @type {import('..').JsonApiSvelteForm} */
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
	$: disabled = !form.state || [ 'saving', 'loading' ].includes(form.state)
</script>

<FormCreate bind:form let:create>
	<FieldSetter bind:form {id} {tokens} {debounceMillis} let:set>
		<slot {create} {set} {value} {errors} {disabled} />
	</FieldSetter>
</FormCreate>
