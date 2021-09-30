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

export interface JsonApiBody {
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

export interface JsonApiError {
	// TODO from the specs
}

export interface FormErrors {
	/**
	 * The mapped errors is a map of resource identifier to an object which has the same property
	 * structure as the resource, but properties only exist if there is an error associated
	 * with that property, and the values are lists of JSON:API error objects.
	 *
	 * For example, if a resource had an error on a `name` property, the `FormErrors` might
	 * look like this:
	 *
	 *   {
	 *       data: {
	 *           001: {
	 *               attributes: {
	 *                   name: [ JsonApiError ]
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
	mapped: JsonApiDataMap;
	other?: Array<JsonApiError>
}

export interface JsonApiError {
	errors: FormErrors;
	state: FormState;
}

export type FormState = 'start' | 'unsaved' | 'unchanged' | 'saving' | 'saved' | 'error';

export interface JsonApiForm {
	original: JsonApiDataMap;
	data: JsonApiDataMap;
	changes: JsonApiChangesMap;
	state: FormState;
	errors?: FormErrors;
}

export interface JsonApiResponseMapper {
	/**
	 * Map of the form index to the resource identifier, either "data" or
	 * the "included" index.
	 */
	[index: string]: string;
}

export interface ToForm {
	body: JsonApiBody;
	state?: FormState;
	mapper?: JsonApiResponseMapper;
}

export function toForm(input: ToForm): JsonApiForm | JsonApiError;

export interface ToRequest {
	form: JsonApiForm;
	id: string;
}

export function toRequest(input: ToRequest): ToForm;
