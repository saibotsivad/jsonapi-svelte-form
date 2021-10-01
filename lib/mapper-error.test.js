import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { error } from './mapper.js'

test('error: map errors with a data and an include', () => {
	const { state, errors } = error({
		body: {
			errors: [
				{
					title: 'first',
					source: { pointer: '/data/attributes/color' }
				},
				{
					title: 'second',
					source: { pointer: '/included/0/attributes/size' }
				},
				{
					title: 'third'
					// no pointer
				},
				{
					title: 'fourth',
					// not a remappable pointer
					source: { pointer: '/foo/bar/fizz' }
				},
			]
		},
		remap: {
			data: '001',
			'0': '002'
		}
	})
	assert.equal('error', state)
	assert.equal({
		mapped: {
			'001': {
				attributes: {
					color: [
						{
							title: 'first',
							source: { pointer: '/data/attributes/color' }
						}
					]
				}
			},
			'002': {
				attributes: {
					size: [
						{
							title: 'second',
							source: { pointer: '/included/0/attributes/size' }
						}
					]
				}
			}
		},
		other: [
			{
				title: 'third'
			},
			{
				title: 'fourth',
				source: { pointer: '/foo/bar/fizz' }
			},
		]
	}, errors)
})

test.run()
