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
	changes: JsonApiChangesMap;
}

export interface FormChangeEventDetail {
	id: string;
	keypath: Array<string | number>;
	value: any;
}

export interface FormChangeEvent {
	detail: FormChangeEventDetail;
}

export interface CreateResourceEventDetail {
	isArray?: boolean;
	type: string;
	relatedId: string;
	relatedName: string;
}

export interface CreateResourceEvent {
	detail: CreateResourceEventDetail;
}

export interface RemoveResourceEventDetail {
	id: string;
	type: string;
}

export interface RemoveResourceEvent {
	detail: RemoveResourceEventDetail;
}

export function createResource(form: JsonApiForm, event: CreateResourceEvent): JsonApiForm;

export function onFormChange(form: JsonApiForm, event: FormChangeEvent): JsonApiForm;

export function resourceCreator(startingCount?: number): (form: JsonApiForm, event: CreateResourceEvent) => JsonApiForm;

export function removeResource(form: JsonApiForm, event: RemoveResourceEvent): JsonApiForm;

export function formFromResponse(response: JsonApiResponse): JsonApiForm;
