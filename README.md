# JSON:API Svelte Form

Tooling for building forms in Svelte for JSON:API backends.

If you use Svelte to build business webapps, and those webapps interact
with [JSON:API](https://jsonapi.org/), than you've probably thought about
building some tooling to help make it easier to build good forms, without
so much boilerplate.

## The Big Idea



## 1: Change Handler

When a form change happens, it looks at the `form` object, sets values, and updates the `form.changes` list.

You would use it like this:

```sveltehtml
<script>
	import MyForm from './path/to/MyForm.svelte'
	import { onFormChange } from 'jsonapi-svelte-form'
	export let form = {
		data: { /*...*/ },
		original: { /*...*/ },
	}
</script>
<MyForm
	on:formChange={event => form = onFormChange(form, event)}
/>
```

### `formChange` Event

The event must emit an `Object` containing these properties:

* `id: String` - The identifier of the resource being changed
* `keypath: Array<String>` - The keypath array of the property being changed, e.g. `[ "attributes", "email" ]`
* `value: *` - The value to set at that keypath

### Undefined vs Empty String

Your form component is responsible for handling the difference between undefined and empty-string.

For example, if you use the `<input>` element and bind to `on:input`, then when the input element is made
to be empty, instead of emitting `undefined` it will emit an empty string.

This matters when calculating the `changes` list for the `form` object: if the property was originally
undefined and a change event is emitted where `value` is the empty string, the `form.changes` list will
not be empty.

This may be wanted or unwanted behaviour, so it is left up to the form to handle the difference.

## 2: Resource Creator

TODO

## 3: Resource Remover

Handle a removeResource event from a JSON:API Form by removing that resource and checking for changes.

Note that this removes the resource and all related, but if you delete a resource it doesn't go through and delete the relationships in *that* resource

it probably shouldn't, it should be part of the responsibility of whoever calls this

## 4: Form from Response

Given a JSON:API response, construct the `JsonApiForm` object, which has the original
and mutable `data` properties as a copy, so they are decoupled and can be used to detect
changes between the two.

The `data` and `original` properties are key-value objects, where the key is the resource id
and the value is the resource.



## Notes

I had to fork `bundt` since it uses `terser@4.8` which doesn't support `?.` but as soon as @lukeed gets around
to updating it (it's a breaking change is why he's waiting) then I can drop my fork.
