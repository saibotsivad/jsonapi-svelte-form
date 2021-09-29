# JSON:API Svelte Form

Tooling for building forms in Svelte for JSON:API backends.

If you use Svelte to build business webapps, and those webapps interact
with [JSON:API](https://jsonapi.org/), than you've probably thought about
building some tooling to help make it easier to build good forms, without
so much boilerplate.

## The Big Idea

Build a form with a couple Svelte component wrappers:

```sveltehtml
<script>
	import { Form, Field } from 'jsonapi-svelte-form'
	export let form // a specially formed object
</script>
<Form bind:form let:remove let:create>
	Inside your form, bind a property to an input element:
	<Field bind:form let:set let:value id="id001" keypath={[ 'attributes', 'color' ]}>
		<input type="text" {value} on:input={event => set(event.target.value)} />
	</Field>
</Form>
```

Now, you can bind values using JSON Pointer paths.

There's a demo [here](https://saibotsivad.github.io/jsonapi-svelte-form/), or as a
[Svelte REPL](https://svelte.dev/repl/ca6db8ec270d4f5c9f8cd679592e8441?version=3.43.0),
to see how to use the tooling.

## More Detailed Example

When you get a response from a JSON:API server, you map it to a `JsonApiForm`
object, probably using the `responseToForm` function:

```js
import { responseToForm } from 'jsonapi-svelte-form/response-to-form'
const fetchVehicle = () => fetch('/api/v1/vehicles/id001')
	.then(response => response.json())
	.then(responseToForm)
```

That data structure looks like this:

```js
const JsonApiForm = {
	// This is the data you'll mutate with your form:
	data: {
		id001: {
			id: 'id001',
			type: 'car',
			attributes: { /* ... */ }
		}
	},
	// A copy is kept around that isn't allowed to change...
	original: {
		id001: {
			id: 'id001',
			type: 'car',
			attributes: { /* ... */ }
		}
	},
	// ...that way the changes between the two can be calculated:
	changes: {
		id001: [
			{
				op: 'add',
				// (Note: the changes are JSON Patch objects, but
				// the path is the array of accessors, instead of
				// the escaped string.)
				path: [ 'attributes', 'color' ],
				value: 'red'
			}
		]
	},
	// If there are errors on a response, they can be mapped to this error
	// object, which is a map to each resource:
	errors: {
		id001: {
			attributes: {
				color: [
					// Each object is a valid JSON:API error object:
					// https://jsonapi.org/format/#error-objects
					{
						code: 'TheServerErrorCode',
						title: 'Human-readable summary.',
						// etc.
					}
				]
			}
		}
	}
}
```

## Field Component

When the `set` function of the `Field` component is called, e.g.:

```sveltehtml
<Field bind:form let:set let:value id="id001" keypath={[ 'attributes', 'color' ]}>
	<input type="text" {value} on:input={event => set(event.target.value)} />
</Field>
```

the component updates the appropriate `form.data` property, and then updates the `form.changes` list
by doing a diff against the `form.original` property.

> **Note:** your component is responsible for handling the difference between undefined and empty-string.

In the example above, when the input element is made to be empty, the default `event.target.value`
is the empty string, so the `form.data` property would be set to the empty string. This matters when
calculating the `changes` list for the `form` object: if the property was originally  undefined and
a change event is emitted where `value` is the empty string, the `form.changes` list will not be empty.

This may be wanted or unwanted behaviour, so it is left up to your implementation to handle the difference.

## Field Component API

Required properties to set on the `Field` component:

* `form: JsonApiForm` - The form object needs to be bound for the reactivity to work.
* `id: String` - The resource identifier to bind to.
* `keypath: String | Array<String|Number>` - Either the JSON Pointer string, e.g. `"/path/to/thing"` or
  the list, e.g. `[ "path", "to", "thing" ]`. (Note: using the string incurs a performance penalty, since
  it will be converted to a list in the `Field` component.)

Optional properties:

* `debounceMillis: Integer` (default: `15`) - On every change, the diff between original and updated
  is calculated. This can get very expensive, and since it blocks the UI, it can cause the form to
  feel very jerky if many changes are made quickly. To counteract this, there is a debounce on the
  diff calculation, and you can modify the debounce delay with this property.

Emitted events:

**change** - Emitted after an object has been updated and the diff has been calculated. It emits an
object with these properties.

* `id: String` - The resource identifier.
* `keypath: Array<String>` - The JSON Pointer accessor tokens.
* `value: any` - The set value.

Slot properties:

* `value: any` - The value located at the resources keypath, or undefined.
* `errors: Array<JsonApiError>` - The list of errors, or an empty list.
* `set: Function` - Call this with the updated value, when it changes.

## Form Component





TODO describe this better






## Form Component Api

Required properties to set on the `Form` component:

* `form: JsonApiForm` - The form object needs to be bound for the reactivity to work.

Optional properties:

* `startingCount: Integer` - The starting number to use on generated identifiers.
* `prefix: String` - The prefix used on the identifiers of created resources.

Slot properties:

* `create: Function` - Used to create a new resource with a generated identifier. Call with
  an object containing these properties:
  * `relId: String` - The identifier of the resource to add this to, as a relationship.
  * `relName: String` - The relationship accessor name of the relationship.
  * `isArray: Boolean` (optional) - Set to true if the relationship is an array style.
  * `type: String` - The type of the resource to create.
* `remove: Function` - Used to remove a resource. Call with an object containing these properties:
  * `id: String` - The identifier of the resource to remove.
  * `type: String` - The type of the resource to remove.

## License

Published and released under the [Very Open License](http://veryopenlicense.com).
