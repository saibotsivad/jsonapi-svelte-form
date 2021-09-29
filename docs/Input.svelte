<script>
	import { get } from 'pointer-props'
	import { Field } from '../src/index.js'

	/** @type string */
	export let type = 'text'
	/** @type string */
	export let label
	/** @type {import('..').JsonApiForm} */
	export let form
	/**
	 * The identifier of the resource to bind to.
	 * @type string
	 * */
	export let id
	/**
	 * The JSON Pointer accessor token list. You can, of course, design your input elements
	 * any way you like, e.g. you could do
	 *   <InputText keypath="/path/to/property" ... />
	 * but then in here, the `get` function would need to un-escape the string on each update,
	 * which is likely to start hurting performance. It's not horrible, but if possible it
	 * will be better to define the keypaths in advance as accessor tokens, e.g.
	 *   <InputText keypath={[ 'path', 'to', 'property' ]}
	 * @type {Array<String | number>}
	 */
	export let keypath
	/** @type boolean */
	export let readonly

	$: accessor = [ id, ...(keypath || []) ]
	$: error = get(form.errors, accessor)
	/**
	 * It is likely true that for each JSON:API resource + keypath, that you'll only have one
	 * element. Therefore, an ID based on those properties is likely unique to the page. If that
	 * is not true for your form, you'd need to do something extra here
	 * @type string
	 */
	$: elementId = accessor.join('.')
</script>

<label for={elementId}>
	{label}
</label>
<Field bind:form {id} {keypath} on:change let:set let:value >
	<input
		{type}
		{readonly}
		{value}
		on:input={event => set(event.target.value)}
		on:*
		id={elementId}
	>
</Field>
{#if error}
 	<div class="invalid-feedback">{error}</div>
{/if}
