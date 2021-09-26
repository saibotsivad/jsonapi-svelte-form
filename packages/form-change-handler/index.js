import { dset } from 'dset'
import _diff from 'just-diff'
const { diff } = _diff
import dlv from 'dlv'

/**
 * @param {JsonApiForm} form
 * @param {FormChangeEvent} detail
 * @returns {JsonApiForm}
 */
export const onFormChange = (form, { detail: { id, keypath, value } }) => {
	const changeKey = `${id}.${keypath}`
	const original = dlv(form.original[id], keypath)

	if (value !== undefined) {
		dset(form, `data.${changeKey}`, value)
	} else {
		let partial = keypath.split('.')
		let last = partial.pop()
		partial = partial.join('.')
		let item = dlv(form, partial)
		if (item) delete item[last]
		dset(form, partial, item)
	}

	form.changes = diff(form.original, form.data)

	// TODO add or remove from changes depending on original (note defined vs not defined)

	return form
}
