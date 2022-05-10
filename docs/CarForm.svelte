<script>
	import { Form } from '../src/index.js'
	import Input from './Input.svelte'

	/**
	 * You can construct a `JsonApiForm` component in many ways, but in this
	 * example we'll pass along the id of the primary resource (the car) as
	 * an id.
	 *
	 * @type string
	 */
	export let carId

	/** @type {import('..').JsonApiForm} */
	export let form
	/** @type boolean */
	export let readonly

	// For any related resources that we want to build components for, we will
	// want to construct them reactively, so that adding/removing them (editing
	// the form) will automatically update the view.
	$: wheels = form.data[carId]?.relationships?.wheels?.data || []

	// To add a resource, call the slot's `create` function. You could call it directly
	// from your component, or if that gets unwieldy you can make a function and call
	// it like this.
	const addPositionToWheel = (create, wheelId) => create({
		relId: wheelId,
		relName: 'positions',
		isArray: true,
		type: 'position'
	})
	// If the resource you are removing has relationships, those related resources are
	// not automatically removed, so if you know that removing them is appropriate you will
	// need to do that by hand, like this.
	const removeWheel = (remove, wheelId) => {
		for (const { id, type } of (form.data[wheelId]?.relationships?.positions?.data || [])) {
			remove({ id, type })
		}
		remove({
			id: wheelId,
			type: 'wheel'
		})
	}
</script>

<Form bind:form let:remove let:create let:errors on:create on:remove>
	<Input
		label="Color"
		id={form.primaryId}
		keypath={[ 'attributes', 'color' ]}
		bind:form
		{readonly}
		on:change
	/>

	<div style="background-color: #ddd; padding: 1em; margin: 1em;">
		<h3 style="margin-top: 0;">
			Wheels
		</h3>

		{#each wheels as wheel}
			<div style="border: 1px solid #000; padding: 15px;">
				<Input
					label="Size"
					id={wheel.id}
					keypath={[ 'attributes', 'size' ]}
					bind:form
					{readonly}
					on:change
				/>
				<br>
				{#each (form.data[wheel.id]?.relationships?.positions?.data || []) as position}
					<Input
						label="Position"
						id={position.id}
						keypath={[ 'attributes', 'position' ]}
						bind:form
						{readonly}
						on:change
					/>
					<button on:click={() => remove(position)}>
						Remove Position
					</button>
					<br>
				{/each}
				<br>
				<button on:click={() => addPositionToWheel(create, wheel.id)}>
					Add Position
				</button>
				<br>
				<button on:click={() => removeWheel(remove, wheel.id)}>
					Remove Wheel
				</button>
			</div>
		{/each}

		<button on:click={() => create({ relId: carId, relName: 'wheels', isArray: true, type: 'wheel' })}>
			Add Wheel
		</button>

	</div>

	{#each errors as error}
		<div class="error">
			<strong>Unmapped Error: {error.title}</strong>
			<br>
			{error.detail}
		</div>
	{/each}
</Form>
