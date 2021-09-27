# @saibotsivad/jsonapi-form-from-response

Given a JSON:API response, construct the `JsonApiForm` object, which has the original
and mutable `data` properties as a copy, so they are decoupled and can be used to detect
changes between the two.

The `data` and `original` properties are key-value objects, where the key is the resource id
and the value is the resource.
