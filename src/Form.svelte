<script>
	import FormCreate from './FormCreate.svelte'
	import FormRemove from './FormRemove.svelte'

	export let form

	$: errors = form?.errors?.other || []
	$: disabled = !form.state || [ 'saving', 'loading' ].includes(form.state)
</script>

<FormRemove bind:form let:remove>
	<FormCreate bind:form let:create>
		<slot {create} {remove} {errors} {disabled} />
	</FormCreate>
</FormRemove>
