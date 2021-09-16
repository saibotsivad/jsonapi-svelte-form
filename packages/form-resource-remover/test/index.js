import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { onRemoveResource } from '../index.js'

test('stuff', () => {
	assert.type(onRemoveResource, 'function')
})

test.run()
