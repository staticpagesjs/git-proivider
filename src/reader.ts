import { join, normalize } from 'path/posix';

import { Git } from './git.js';
import { findByGlob } from './find-by-glob.js';

export namespace reader {
	export type Options<T extends Record<string, unknown>, E extends object = findByGlob.Options> = {
		repository?: string;
		branch?: string;
		cwd?: string;
		mode?(options: E): Iterable<string> | AsyncIterable<string>;
		parser(body: Buffer, file: string, options: Options<T, E>): T | Promise<T>;
		onError?(error: unknown): void;
	} & E;
}

/**
 * Reads documents from a specified branch of a git repository.
 */
export async function* reader<T extends Record<string, unknown>, E extends object = findByGlob.Options>(options: reader.Options<T, E>) {
	const optionsWithDefaults: reader.Options<T, E> = {
		repository: '.',
		branch: 'master',
		cwd: 'pages',
		mode: findByGlob,
		onError: error => { console.error(error); },
		...options,
	};
	const { repository, branch, cwd, mode, parser, onError } = optionsWithDefaults;

	if (typeof mode !== 'function') throw new Error('Argument type mismatch, \'mode\' expects a function.');

	const files = mode(optionsWithDefaults);

	if (typeof (files as any)[Symbol.iterator] !== 'function' && typeof (files as any)[Symbol.asyncIterator] !== 'function') throw new Error('Argument type mismatch, \'mode\' expects a function that returns an Iterable or an AsyncIterable.');
	if (typeof parser !== 'function') throw new Error('Argument type mismatch, \'parser\' expects a function.');
	if (typeof onError !== 'function') throw new Error('Argument type mismatch, \'onError\' expects a function.');
	if (typeof cwd !== 'string') throw new Error('Argument type mismatch, \'cwd\' expects a string.');
	if (typeof repository !== 'string') throw new Error('Argument type mismatch, \'repository\' expects a string.');
	if (typeof branch !== 'string') throw new Error('Argument type mismatch, \'branch\' expects a string.');

	const git = new Git({
		cwd: repository,
	});

	for await (const file of files) {
		try {
			yield await parser(
				git.readFile(normalize(join(cwd, file)), branch),
				file,
				optionsWithDefaults
			);
		} catch (error) {
			onError(error);
		}
	}
}

export default reader;
