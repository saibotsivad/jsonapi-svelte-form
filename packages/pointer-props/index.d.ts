export function toSegments(path: string): Array<string>;

export function fromSegments(list: ArrayLike<string | number>): string;

export function get(obj: any, path: string | ArrayLike<string | number>): any;

export function set<T extends object, V>(obj: T, path: string | ArrayLike<string | number>, value: V): T;

export function unset<T extends object>(obj: T, path: string | ArrayLike<string | number>): T;
