import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { load } from './mapper.js'

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
	const form = load(response, 0)
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
		primaryId: 'thing1',
		gidIndex: 0,
		state: 'loaded',
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
		state: 'loaded',
		gidIndex: 0,
	}, form)
})

test('load: when nothing is passed in aka a create form', () => {
	const form = load()
	assert.equal({
		data: {},
		original: {},
		changes: {},
		state: 'loaded',
		gidIndex: 0,
	}, form)
})

test('load: set the GID index on create', () => {
	const form = load({}, 3)
	assert.equal({
		data: {},
		original: {},
		changes: {},
		state: 'loaded',
		gidIndex: 3,
	}, form)
})

test.run()
