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

export interface JsonApiDataMap {
	[index: string]: JsonApiData;
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
	changes?: Array<JsonApiChange>;
}

export interface FormChangeEventDetail {
	id: string;
	keypath: string;
	value: any;
}

export interface FormChangeEvent {
	detail: FormChangeEventDetail;
}
