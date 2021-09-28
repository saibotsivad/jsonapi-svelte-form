import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { removeResource } from './index.js'

test('removeResource', () => {
	const data = {
		'thing1': {
			id: 'thing1',
			type: 'thing',
			relationships: {
				foo: {
					id: 'thing3',
					type: 'thing'
				}
			}
		},
		'thing2': {
			id: 'thing2',
			type: 'thing',
			relationships: {
				fizz: [{
					id: 'thing3',
					type: 'thing'
				}]
			}
		},
		'thing3': {
			id: 'thing3',
			type: 'thing'
		}
	}

	const result = removeResource(
		{
			data,
			original: JSON.parse(JSON.stringify(data)),
			changes: {}
		},
		{
			detail: {
				id: 'thing3',
				type: 'thing'
			}
		}
	)

	assert.not.ok(result.data.thing1.relationships, 'fully removed')
	assert.not.ok(result.data.thing2.relationships, 'fully removed')
	assert.equal(result.changes.thing1, [ { op: 'remove', path: [ 'relationships' ] } ], 'was removed')
	assert.equal(result.changes.thing2, [ { op: 'remove', path: [ 'relationships' ] } ], 'was removed')
	assert.equal(result.changes.thing3.length, 2, 'there are two ops')
	assert.equal(result.changes.thing3, [
		{ op: 'remove', path: [ 'type' ] },
		{ op: 'remove', path: [ 'id' ] }
	], 'removal deletes the root props')
})

test.run()
