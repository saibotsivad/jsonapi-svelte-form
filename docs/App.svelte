<script>
	import CarForm from './CarForm.svelte'
	import { fetchCarFromApi } from './mock-api.js'
	import { formFromResponse, resourceCreator, removeResource, onFormChange } from '../src/index.js'

	/** @type {import('..').JsonApiForm} */
	let form = {
		data: {},
		original: {},
		errors: {},
		changes: {}
	}
	/** @type boolean */
	let readonly = false

	/**
	 * Here we are demonstrating one of the ways to reactively update the display based on
	 * whether there are any changes between the original and current form. This is typically
	 * used to, e.g., leave a "Save Changes" button disabled until there are actual changes.
	 * @type boolean
	 */
	$: hasChanges = Object.keys(form.changes || {}).length

	/** @type {import('..').createResource} */
	const create = resourceCreator()

	// Here we simulate loading from an API that gives back a
	// normal JSON:API response object. We need to transform
	// that into the `JsonApiForm` object structure.
	const loadCar = () => fetchCarFromApi()
		.then(response => {
			form = formFromResponse(response)
		})
</script>

<h1>JSON:API Svelte Form (Demo)</h1>

<p>
	This is a demo of the
	<a href="https://github.com/saibotsivad/jsonapi-svelte-form"><code>jsonapi-svelte-form</code></a>
	library, which is a tool to help make forms which use
	<a href="https://jsonapi.org/">JSON:API</a>
	for the backend.
</p>

<hr>

<p>
	You would probably normally use your routing library or other framework tools to
	load data for a form, but here we're simulating it by "fetching" from a mock API.
</p>
<button on:click={loadCar}>Load Car</button>
<hr>

<h2>Car Editor</h2>

<CarForm
	carId="001"
	{form}
	{readonly}
	on:formChange={event => form = onFormChange(form, event)}
	on:createResource={event => form = create(form, event)}
	on:removeResource={event => form = removeResource(form, event)}
/>

<p>
	The "Save Changes" button doesn't actually do anything, it's just a demo of how
	you are able to disable saving if no changes are made. Try editing
	some fields, then changing them back to what they were, to see the
	button enable and then disable.
</p>

<button disabled={!hasChanges}>Save Changes</button>

<hr/>

<p>
	Here you can see what the <code>form</code> object looks like, as you modify it.
</p>

<pre>{JSON.stringify(form, undefined, 4)}</pre>
