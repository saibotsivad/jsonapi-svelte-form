import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { initializeResourceCreator } from '../index.js'

test('stuff', () => {
	assert.type(initializeResourceCreator, 'function')
})

test.run()
