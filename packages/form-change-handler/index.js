import { set, unset } from 'pointer-props'
import _diff from 'just-diff'
const { diff } = _diff

/**
 * Handle formChange events emitted by JSON:API Forms by updating the form and calculating changes.
 *
 * @type {import('.').onFormChange}
 */
export const onFormChange = (form, { detail: { id, keypath, value } }) => {
	const changeKey = [ 'data', id, ...keypath ]
	if (value !== undefined) {
		set(form, changeKey, value)
	} else {
		unset(form, changeKey)
	}
	form.changes[id] = diff(form.original[id] || {}, form.data[id] || {})
	return form
}
