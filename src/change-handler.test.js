import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { onFormChange } from './index.js'

test('onFormChange', () => {
	assert.type(onFormChange, 'function')
	const result = onFormChange({
		data: {
			item1: {
				id: 'item1',
				type: 'thing',
				attributes: { foo: 'bar' }
			}
		},
		original: {
			item1: {
				id: 'item1',
				type: 'thing',
				attributes: { foo: 'bar' }
			}
		},
		changes: {},
	}, {
		detail: {
			id: 'item1',
			keypath: [ 'attributes', 'foo' ],
			value: 'not bar'
		}
	})
	assert.equal(result.data.item1.attributes.foo, 'not bar', 'the change was applied')
	assert.equal(result.original.item1.attributes.foo, 'bar', 'the original is unaffected')
	assert.equal(Object.keys(result.changes).length, 1, 'there is one change overall')
	assert.equal(result.changes.item1.length, 1, 'there is one change to the resource')
	assert.equal(result.changes.item1[0].op, 'replace', 'it has a change')
})

test.run()
