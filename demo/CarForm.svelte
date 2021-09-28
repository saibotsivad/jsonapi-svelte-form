<script>
	import { createEventDispatcher } from 'svelte'
	import InputText from './InputText.svelte'

	/**
	 * You can construct a `JsonApiForm` component in many ways, but in this
	 * example we'll pass along the id of the primary resource (the car) as
	 * an id.
	 *
	 * @type string
	 */
	export let carId

	/** @type {import('..').JsonApiData} */
	export let data
	/** @type boolean */
	export let readonly
	// TODO
	export let errors

	/**
	 * For any related resources that we want to build components for, we will
	 * want to construct them reactively, so that adding/removing them (editing
	 * the form) will automatically update the view.
	 */
	$: wheels = data?.[carId]?.relationships?.wheels?.data || []

	/**
	 * For any editable related resources, you'll need to create dispatchers to send the
	 * createResource/removeResource events. Here they are in the CarForm component, but
	 * it's likely that they'll be embedded in deeper components, in which case you'd
	 * simply forward the event along:
	 *   <WheelEditor on:createResource on:removeResource {data} ... />
	 */
	const dispatcher = createEventDispatcher()
	const addWheel = () => dispatcher('createResource', {
		relatedId: carId,
		relatedName: 'wheels',
		isArray: true,
		type: 'wheel'
	})
	const removeWheel = wheelId => dispatcher('removeResource', {
		id: wheelId,
		type: 'wheel'
	})
	const addPositionToWheel = wheelId => dispatcher('createResource', {
		relatedId: wheelId,
		relatedName: 'position',
		isArray: true,
		type: 'position'
	})
	const removePosition = positionId => dispatcher('removeResource', {
		id: positionId,
		type: 'position'
	})
</script>

<InputText
	label="Color"
	id="001"
	keypath={[ 'attributes', 'color' ]}
	{data}
	{readonly}
	{errors}
	on:formChange
/>

<div style="background-color: #ddd; padding: 1em; margin: 1em;">
	<h3 style="margin-top: 0;">
		Wheels
	</h3>

	{#each wheels as wheel}
		<div style="border: 1px solid #000; padding: 15px;">
			<InputText
				label="Size"
				id={wheel.id}
				keypath={[ 'attributes', 'size' ]}
				{data}
				{readonly}
				{errors}
				on:formChange
			/>
			<br>
			{#each (data[wheel.id]?.relationships?.position?.data || []) as position}
				<InputText
					label="Position"
					id={position.id}
					keypath={[ 'attributes', 'name' ]}
					{data}
					{readonly}
					{errors}
					on:formChange
				/>
				<button on:click={() => removePosition(position.id)}>
					Remove Position
				</button>
				<br>
			{/each}
			<br>
			<button on:click={() => addPositionToWheel(wheel.id)}>
				Add Position
			</button>
			<br>
			<button on:click={() => removeWheel(wheel.id)}>
				Remove Wheel
			</button>
		</div>
	{/each}

	<button on:click={addWheel}>
		Add Wheel
	</button>

</div>
