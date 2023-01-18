import * as path from 'path';

import { Git } from './git.js';
import { reader } from './reader.js';

type Data<T> = {
	header: {
		commit: {
			hash: string;
			abbrev: string;
			authorName: string;
			authorEmail: string;
			authorDate: string;
			commiterName: string;
			commiterEmail: string;
			committerDate: string;
			message: string;
			changes: {
				status: string,
				path: string,
				srcPath?: string,
				similarity?: number,
			};
		};
		repository: string;
		branch: string;
		cwd: string;
		path: string;
		dirname: string;
		basename: string;
		extname: string;
	};
} & T;

const commits = new WeakMap();
const getCommit = (opts: any): string => {
	if (!commits.has(opts)) {
		const git = new Git({ cwd: opts.repository });
		commits.set(opts, git.commitInfo(opts.branch));
	}
	return commits.get(opts);
};

/**
 * Creates a `header` property containing segments of the file full path.
 *
 * The return type depends on the provided `bodyParser` return type. If its a Promise, this call also returns a Promise.
 */
export function parseHeader(): {
	(body: Buffer, file: string, options: reader.Options<Record<string, unknown>, {}>): Data<{ body: Buffer; }>;
};

/**
 * Creates a `header` property containing segments of the file full path.
 *
 * The return type depends on the provided `bodyParser` return type. If its a Promise, this call also returns a Promise.
 */
export function parseHeader<R extends Record<string, unknown>>(bodyParser: { (body: Buffer, file: string, options: reader.Options<Data<R>, Record<string, unknown>>): R; }): {
	(body: Buffer, file: string, options: reader.Options<Data<R>, Record<string, unknown>>): Data<R>;
};

/**
 * Creates a `header` property containing segments of the file full path.
 *
 * The return type depends on the provided `bodyParser` return type. If its a Promise, this call also returns a Promise.
 */
export function parseHeader<R extends Record<string, unknown>>(bodyParser: { (body: Buffer, file: string, options: reader.Options<Data<R>, Record<string, unknown>>): Promise<R>; }): {
	(body: Buffer, file: string, options: reader.Options<Data<R>, Record<string, unknown>>): Promise<Data<R>>;
};

/**
 * Creates a `header` property containing segments of the file full path.
 *
 * The return type depends on the provided `bodyParser` return type. If its a Promise, this call also returns a Promise.
 */
export function parseHeader(bodyParser: { (body: any, file: string, options: any): any | Promise<any>; } = body => ({ body })) {
	if (bodyParser.constructor.name === 'AsyncFunction') {
		return async (body: Buffer, file: string, options: any) => {
			const extName = path.extname(file);
			const { header, ...payload } = await (bodyParser(body, file, options) as Promise<any>);
			return {
				header: {
					repository: path.resolve(options.repository ?? '.').replace(/\\/g, '/'),
					branch: options.branch,
					cwd: options.cwd,
					latestCommit: getCommit(options),
					path: file,
					dirname: path.dirname(file),
					basename: path.basename(file, extName),
					extname: extName
				},
				...payload
			};
		};
	} else {
		return (body: Buffer, file: string, options: any) => {
			const extName = path.extname(file);
			const { header, ...payload } = bodyParser(body, file, options);
			return {
				header: {
					repository: path.resolve(options.repository ?? '.').replace(/\\/g, '/'),
					branch: options.branch,
					cwd: options.cwd,
					latestCommit: getCommit(options),
					path: file,
					dirname: path.dirname(file),
					basename: path.basename(file, extName),
					extname: extName
				},
				...payload
			};
		};
	};
}

export default parseHeader;
