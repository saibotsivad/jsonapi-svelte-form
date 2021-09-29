import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { responseToForm } from './response-to-form.js'

test('responseToForm: data is single', () => {
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
	const form = responseToForm(response)
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
		changes: {},
		errors: {}
	}, form)
	form.data.thing1.type = 'not thing'
	assert.equal(form.original.thing1.type, 'thing', 'not connected by reference')
})

test('responseToForm: data is list', () => {
	const response = {
		data: [
			{
				id: 'thing1',
				type: 'thing',
			}
		]
	}
	const form = responseToForm(response)
	assert.equal({
		data: {
			thing1: {
				id: 'thing1',
				type: 'thing',
			},
		},
		original: {
			thing1: {
				id: 'thing1',
				type: 'thing',
			},
		},
		changes: {},
		errors: {}
	}, form)
})

test.run()
