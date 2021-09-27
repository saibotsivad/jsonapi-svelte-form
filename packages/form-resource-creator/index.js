import { get, set } from 'pointer-props'
import _diff from 'just-diff'
const { diff } = _diff

/**
 * Given a `resourceCreate` event, update the JSON:Api Form with a resource containing an auto-generated
 * identifier, and adds the form relationship to the defined path.
 *
 * @type {import('.').initializeResourceCreator}
 */
export const initializeResourceCreator = (startingCount = 0) => {
	let count = startingCount
	return (form, { detail: { relatedId, relatedName, isArray, type } }) => {
		let id = `GID${++count}`
		form.data[id] = { type, id }
		let relatedKeypath = [ relatedId, 'relationships', relatedName, 'data' ]
		set(
			form.data,
			relatedKeypath,
			isArray
				? [ ...(get(form.data, [ relatedId, 'relationships', relatedName, 'data' ]) || []), { type, id } ]
				: { type, id }
		)
		form.changes[id] = diff({}, form.data[id])
		return form
	}
}
