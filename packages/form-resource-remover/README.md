# @saibotsivad/jsonapi-resource-remover

Handle a removeResource event from a JSON:API Form by removing that resource and checking for changes.

Note that this removes the resource and all related, but if you delete a resource it doesn't go through and delete the relationships in *that* resource

it probably shouldn't, it should be part of the responsibility of whoever calls this
