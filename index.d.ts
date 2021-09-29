import type { Operation } from 'just-diff';

export interface JsonApiRelationshipSingle {
	id: string;
	type: string;
}

export interface JsonApiRelationships {
	[index: string]: JsonApiRelationshipSingle | Array<JsonApiRelationshipSingle>;
}

export interface JsonApiData {
	id: string;
	type: string;
	attributes?: object;
	meta?: object;
	relationships?: JsonApiRelationships;
}

export interface JsonApiResponse {
	data: Array<JsonApiData> | JsonApiData;
	included?: Array<JsonApiData>;
}

export interface JsonApiDataMap {
	[id: string]: JsonApiData;
}

export interface JsonApiChangesMap {
	[id: string]: Array<JsonApiChange>;
}

// from: https://github.com/angus-c/just/blob/master/packages/collection-diff/index.d.ts
export interface JsonApiChange {
	op: Operation;
	path: Array<string | number>;
	value: any;
}

export interface JsonApiForm {
	original: JsonApiDataMap;
	data: JsonApiDataMap;
	/**
	 * The errors is a map of resource identifier to an object which has the same property
	 * structure as the resource, but properties only exist if there is an error associated
	 * with that property, and the values are all human-readable string error messages.
	 *
	 * For example, if a resource had an error on a `name` property, the `JsonApiForm` might
	 * look like this:
	 *
	 *   {
	 *       data: {
	 *           001: {
	 *               attributes: {
	 *                   name: 'foo'
	 *               }
	 *           }
	 *       },
	 *       errors: {
	 *           001: {
	 *               attributes: {
	 *                   name: 'The name must not be "foo".'
	 *               }
	 *           }
	 *       }
	 *   }
	 */
	errors: JsonApiDataMap;
	changes: JsonApiChangesMap;
}

export function responseToForm(response: JsonApiResponse): JsonApiForm;