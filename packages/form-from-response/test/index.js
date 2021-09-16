import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { formFromResponse } from '../index.js'

test('stuff', () => {
	assert.type(formFromResponse, 'function')
})

test.run()
