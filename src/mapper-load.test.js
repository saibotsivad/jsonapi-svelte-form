import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { load } from './mapper.js'
// TODO a file for each function

test('load: when data is single', () => {
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
	const form = load(response)
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

test('load: when data is a list', () => {
	const response = {
		data: [
			{
				id: 'thing1',
				type: 'thing',
			}
		]
	}
	const form = load(response)
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

// TODO is this still a good idea?
test('load: when nothing is passed in aka a create form', () => {
	const form = load()
	assert.equal({
		data: {},
		original: {},
		changes: {},
		errors: {}
	}, form)
})

test.run()
