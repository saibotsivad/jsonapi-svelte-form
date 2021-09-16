import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { onFormChange } from '../index.js'

test('stuff', () => {
	assert.type(onFormChange, 'function')
})

test.run()
