import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { onFormChange } from '../index.js'

test('stuff', () => {
	assert.type(onFormChange, 'function')
	const result = onFormChange({
		data: {
			item1: {
				id: 'item1',
				type: 'thing'
			}
		},
		original: {
			item1: {
				id: 'item1',
				type: 'thing'
			}
		}
	}, {
		detail: {
			id: 'a',
			keypath: 'b',
			value: 'c'
		}
	})
})

test.run()
