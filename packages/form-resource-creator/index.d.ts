import type { JsonApiForm, CreateResourceEvent } from '@saibotsivad/jsonapi-form-types';

export function initializeResourceCreator(startingCount?: number): (form: JsonApiForm, event: CreateResourceEvent) => JsonApiForm;
