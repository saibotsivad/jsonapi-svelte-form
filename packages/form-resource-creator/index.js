import { dset } from 'dset'
import _diff from 'just-diff'
const { diff } = _diff
import dlv from 'dlv'

export const initializeResourceCreator = (startingCount = 0) => {
	let count = startingCount
	return (form, { detail: { relationship, isArray, type } }) => {
		const id = `GID${count++}`
		dset(form, `data.${id}`, { type, id })
		dset(
			form.data,
			relationship,
			isArray
				? [ ...(dlv(form.data, relationship) || []), { type, id } ]
				: { type, id }
		)

		form.changes = diff(form.original, form.data)
		return form
	}
}
