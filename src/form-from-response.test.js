import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { formFromResponse } from './index.js'

test('formFromResponse', () => {
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
	const form = formFromResponse(response)
	assert.equal({
		data: {
			thing1: {
				id: 'thing1',
				type: 'thing',
			},
			thing2: {
				id: 'thing2',
				type: 'thing',
			},
		},
		original: {
			thing1: {
				id: 'thing1',
				type: 'thing',
			},
			thing2: {
				id: 'thing2',
				type: 'thing',
			},
		},
		changes: {}
	}, form)

	form.data.thing1.type = 'not thing'

	assert.equal(form.original.thing1.type, 'thing', 'not connected by reference')
})

test.run()
