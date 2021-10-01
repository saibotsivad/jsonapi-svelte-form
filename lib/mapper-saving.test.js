import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { saving } from './mapper.js'

test('saving: with a data and an include', () => {
	const { body, remap } = saving({
		data: {
			'001': {
				id: '001',
				type: 'car',
				attributes: { color: 'red' }
			},
			'002': {
				id: '002',
				type: 'wheel',
				attributes: { size: 'big' }
			}
		},
		primaryId: '001'
	})
	assert.equal({
		data: '001',
		'0': '002'
	}, remap)
	assert.equal({
		data: {
			id: '001',
			type: 'car',
			attributes: { color: 'red' }
		},
		included: [
			{
				id: '002',
				type: 'wheel',
				attributes: { size: 'big' }
			}
		],
	}, body)
})

test('saving: with data and no additional', () => {
	const { body, remap } = saving({
		data: {
			'001': {
				id: '001',
				type: 'car',
				attributes: { color: 'red' }
			},
		},
		primaryId: '001'
	})
	assert.equal({
		data: '001',
	}, remap)
	assert.equal({
		data: {
			id: '001',
			type: 'car',
			attributes: { color: 'red' }
		},
	}, body)
})

test.run()
