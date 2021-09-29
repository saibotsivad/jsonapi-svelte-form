<script>
	import CarForm from './CarForm.svelte'
	import { fetchCarFromMockApi } from './mock-api.js'

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
	 * The `Field` component emits a change event, which you could use to
	 * do some other business logic, as needed. Here we're just storing it to look
	 * at for the demo.
	 */
	let lastChange

	/**
	 * Here we are demonstrating one of the ways to reactively update the display based on
	 * whether there are any changes between the original and current form. This is typically
	 * used to, e.g., leave a "Save Changes" button disabled until there are actual changes.
	 * @type boolean
	 */
	$: hasChanges = Object.keys(form.changes || {}).length

	const loadCar = () => fetchCarFromMockApi()
		.then(result => form = result)
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
	bind:form
	{readonly}
	on:change={event => lastChange = [ 'change', event.detail ]}
	on:create={event => lastChange = [ 'create', event.detail ]}
	on:remove={event => lastChange = [ 'remove', event.detail]}
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
	The <code>Form</code> and <code>Field</code> components emit events, which you
	could use to drive other business logic. The demo isn't using them for anything,
	but you can see what they looks like here after you've changed something, or
	created or removed a resource.
</p>

<pre>{JSON.stringify(lastChange, undefined, 4)}</pre>

<hr>

<p>
	Here you can see what the <code>form</code> object looks like, as you modify it.
</p>

<pre>{JSON.stringify(form, undefined, 4)}</pre>
