import { dset } from 'dset'
import _diff from 'just-diff'
const { diff } = _diff
import dlv from 'dlv'

export const onFormChange = (form, { detail: { id, keypath, value } }) => {
	const changeKey = `${id}.${keypath}`
	const original = dlv(form.original[id], keypath)

	if (value !== undefined) {
		dset(form, `data.${changeKey}`, value)
	}
	form.changes = diff(form.original, form.data)

	// TODO add or remove from changes depending on original (note defined vs not defined)

	return form
}
