import type { Operation } from 'just-diff';

export interface JsonApiRelationshipSingle {
	id: string;
	type: string;
}

export interface JsonApiRelationshipData {
	data:  JsonApiRelationshipSingle | Array<JsonApiRelationshipSingle>
}
export interface JsonApiRelationships {
	[index: string]: JsonApiRelationshipData;
}
export interface JsonApiData {
	id: string;
	type: string;
	attributes?: object;
	meta?: object;
	relationships?: JsonApiRelationships;
}
export interface JsonApiLinks {
	about?: string;
}
export interface JsonApiErrorSource {
	pointer?: string;
	parameter?: string;
}
export interface JsonApiError {
	id?: string;
	links?: JsonApiLinks;
	status?: string;
	code?: string;
	title?: string;
	detail?: string;
	source?: JsonApiErrorSource;
	meta?: object;
}
export interface JsonApiSuccessBody {
	data: Array<JsonApiData> | JsonApiData;
	included?: Array<JsonApiData>;
}
export interface JsonApiSingleResourceSuccessBody {
	data: JsonApiData;
	included?: Array<JsonApiData>;
}
export interface JsonApiErrorBody {
	errors: Array<JsonApiError>;
}

export interface FormDataMap {
	[id: string]: JsonApiData;
}
export interface FormChangesMap {
	[id: string]: Array<FormChange>;
}
export interface FormChange {
	op: Operation; // from: https://github.com/angus-c/just/blob/master/packages/collection-diff/index.d.ts
	path: Array<string | number>;
	value: any;
}
export interface FormErrors {
	/**
	 * The mapped errors is a map of resource identifier to an object which has the same property
	 * structure as the resource, but properties only exist if there is an error associated
	 * with that property, and the values are lists of `JsonApiError` objects.
	 *
	 * For example, if a resource had an error on a `name` property, the `FormErrors` might
	 * look like this:
	 *
	 *   {
	 *       mapped: {
	 *           001: {
	 *               attributes: {
	 *                   name: [ JsonApiError ]
	 *               }
	 *           }
	 *       },
	 *       others: [ JsonApiError ]
	 *   }
	 */
	mapped: FormDataMap;
	other?: Array<JsonApiError>
}

/**
 * The form transitions through states in an FSM manner:
 *
 *   State   |  Allowed Transitions
 * ----------|-----------------------
 * null      | loading
 * loading   | loaded, error
 * loaded    | changed, error
 * changed   | unchanged, saving, error
 * unchanged | changed, error
 * saving    | saved, error
 * saved     | changed, error
 * error     | unchanged
 */
export type FormState = null | undefined | 'loading' | 'loaded' | 'changed' | 'unchanged' | 'saving' | 'saved' | 'error';

export interface JsonApiSvelteForm {
	original: FormDataMap;
	data: FormDataMap;
	changes: FormChangesMap;
	state: FormState;
	errors?: FormErrors;
	gidIndex?: number;
}
export interface SavableJsonApiSvelteForm extends JsonApiSvelteForm {
	/**
	 * If the form is concerned primarily with a single resource, e.g. if fetching, saving,
	 * and updating, will all write to a JSON:API endpoint where the `data` property is a
	 * single resource, than this property will indicate the identifier of that resource.
	 */
	primaryId: string;
}
export function load(body: JsonApiSuccessBody, gidIndex: Number): JsonApiSvelteForm;
export function saved(body: JsonApiSingleResourceSuccessBody): SavableJsonApiSvelteForm;

/**
 * Map of the form index (either "data" or the "included" index) to the resource
 * identifier, for example:
 *   {
 *       data: 'id001',
 *       0: 'id123',
 *       1: 'id456'
 *   }
 */
export interface FormErrorRemap {
	[index: string]: string;
}

export interface SavingDetails {
	body: JsonApiSingleResourceSuccessBody;
	remap: FormErrorRemap;
}
export function saving(form: SavableJsonApiSvelteForm): SavingDetails;

export interface TransitionToError {
	body: JsonApiErrorBody;
	remap: FormErrorRemap;
}
export interface ErrorDetails {
	errors: FormErrors;
	state: "error";
}
export function error(input: TransitionToError): ErrorDetails;

export function set(v: any);

export interface CreateDetails {
	relId: string;
	relName: string;
	type: string;
	isArray?: boolean;
}
export function create(input: CreateDetails);

export interface RemoveDetails {
	id: string;
	type: string;
}
export function remove(input: RemoveDetails);
