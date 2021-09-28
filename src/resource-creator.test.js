import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { resourceCreator } from './index.js'

test('initializeResourceCreator', () => {
	const create = resourceCreator(3)
	const form = create(
		{
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
			},
			changes: {}
		},
		{
			detail: {
				relatedId: 'item1',
				relatedName: 'stuffs',
				isArray: true,
				type: 'stuff'
			}
		}
	)
	assert.ok(form.data.GID4, 'the new resource exists')
	assert.equal(form.data.GID4.type, 'stuff', 'set as correct type')
	assert.equal(form.data.item1.relationships.stuffs.data, [{ id: 'GID4', type: 'stuff' }], 'relationship added')
})

test.run()
