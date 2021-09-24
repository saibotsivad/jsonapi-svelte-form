# @saibotsivad/jsonapi-form-change-handler

When a form change happens, it looks at the `form` object, sets values, and updates the `form.changes` list.

You would use it like this:

```sveltehtml
<script>
	import MyForm from './path/to/MyForm.svelte'
	import { onFormChange } from '@saibotsivad/jsonapi-form-change-handler'
	export let form = {
		data: { /*...*/ },
		original: { /*...*/ },
	}
</script>
<MyForm
	on:formChange={event => form = onFormChange(form, event)}
/>
```

## `formChange` Event

The event must emit an `Object` containing these properties:

* `id: String` - The identifier of the resource being changed
* `keypath: String` - The dot-notation keypath of the property being changed, e.g. `attributes.email`
* `value: *` - The value to set at that keypath

## Undefined vs Empty String

Your form component is responsible for handling the difference between undefined and empty-string.

For example, if you use the `<input>` element and bind to `on:input`, then when the input element is made
to be empty, instead of emitting `undefined` it will emit an empty string.

This matters when calculating the `changes` list for the `form` object: if the property was originally
undefined and a change event is emitted where `value` is the empty string, the `form.changes` list will
not be empty.

This may be wanted or unwanted behaviour, so it is left up to the form to handle the difference.
