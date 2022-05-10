<script>
	import _diff from 'just-diff'
	const { diff } = _diff

	const makeDiff = (form, id) => {
		form.changes[id] = diff(form.original[id] || {}, form.data[id] || {})
		if (!form.changes[id].length) delete form.changes[id]
		if (Object.keys(form.changes).length) form.state = 'unsaved'
		else form.state = 'unchanged'
	}
</script>

<slot {makeDiff} />
