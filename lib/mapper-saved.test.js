import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { saved } from './mapper.js'

test('saved: its the same as load but a different state', () => {
	const response = {
		data: {
			id: 'thing1',
			type: 'thing',
		},
		included: [
			{
				id: 'thing2',
				type: 'thing',
			}
		]
	}
	const form = saved(response)
	assert.equal(form.state, 'saved')
})

test.run()
