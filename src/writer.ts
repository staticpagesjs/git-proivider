import * as path from 'path/posix';

import { Git } from './git.js';
import nameByHeader from './name-by-header.js';
import nameByUrl from './name-by-url.js';

export namespace writer {
	export type Options<T extends Record<string, unknown>> = {
		repository?: string;
		branch?: string;
		authorName?: string;
		authorEmail?: string;
		commiterName?: string;
		commiterEmail?: string;
		message?: string;
		cwd?: string;
		namer?: { (data: Readonly<T>): string | undefined | void | Promise<string | undefined | void>; } | { (data: Readonly<T>): string | undefined | void | Promise<string | undefined | void>; }[];
		renderer(data: Readonly<T>): string | NodeJS.ArrayBufferView | undefined | void | Promise<string | NodeJS.ArrayBufferView | undefined | void>;
		onError?(error: unknown): void;
	};
}

let indexPrepared = false;
let isFileAdded = false;

/**
 * Writes documents to a specified branch of a git repository.
 */
export function writer<T extends Record<string, unknown>>({
	repository = '.',
	branch = 'master',
	authorName = 'anonymous',
	authorEmail = 'anonymous@example.com',
	commiterName = authorName,
	commiterEmail = authorEmail,
	message = 'No commit message.',
	cwd = 'dist',
	namer = [nameByUrl, nameByHeader, () => { throw new Error('Naming error: could not create an output filename based on .url or .header.path properties.'); }],
	renderer,
	onError = error => { console.error(error); },
}: writer.Options<T>) {
	if (!Array.isArray(namer)) namer = [namer];

	if (typeof repository !== 'string') throw new Error('Argument type mismatch, \'repository\' expects a string.');
	if (typeof branch !== 'string') throw new Error('Argument type mismatch, \'branch\' expects a string.');
	if (typeof authorName !== 'string') throw new Error('Argument type mismatch, \'authorName\' expects a string.');
	if (typeof authorEmail !== 'string') throw new Error('Argument type mismatch, \'authorEmail\' expects a string.');
	if (typeof commiterName !== 'string') throw new Error('Argument type mismatch, \'commiterName\' expects a string.');
	if (typeof commiterEmail !== 'string') throw new Error('Argument type mismatch, \'commiterEmail\' expects a string.');
	if (typeof message !== 'string') throw new Error('Argument type mismatch, \'message\' expects a string.');
	if (typeof cwd !== 'string') throw new Error('Argument type mismatch, \'cwd\' expects a string.');
	if (namer.some(x => typeof x !== 'function')) throw new Error('Argument type mismatch, \'namer\' expects a function or an array of functions.');
	if (typeof renderer !== 'function') throw new Error('Argument type mismatch, \'renderer\' expects a function.');
	if (typeof onError !== 'function') throw new Error('Argument type mismatch, \'onError\' expects a function.');

	const git = new Git({
		env: {
			GIT_DIR: repository,
			GIT_AUTHOR_NAME: authorName,
			GIT_AUTHOR_EMAIL: authorEmail,
			GIT_COMMITTER_NAME: commiterName,
			GIT_COMMITTER_EMAIL: commiterEmail,
		}
	});

	let parentCommit = git.currentCommit(branch);
	if (!indexPrepared) {
		git.loadIndex(parentCommit);
		indexPrepared = true;
	}

	const write = async function (data: T) {
		try {
			let outputPath;
			for (const fn of namer as any) {
				outputPath = await fn(data);
				if (outputPath && typeof outputPath === 'string') break;
			}
			if (!outputPath || typeof outputPath !== 'string') return;

			const rendered = await renderer(data);
			if (!rendered) return;

			git.writeFile(path.join(cwd, outputPath), rendered);
			if (!isFileAdded) isFileAdded = true;
		} catch (error) {
			onError(error);
		}
	};

	write.teardown = () => {
		if (indexPrepared) {
			if (isFileAdded) {
				git.updateBranch(branch, git.saveIndex(message, parentCommit));
				isFileAdded = false;
			}
			// non-bare repositories index should be set to reflect HEAD
			// bare repositories does not have an index, so our index does not matter
			// TODO: no need to reset to HEAD on bare repositories
			git.loadIndex('HEAD');
			indexPrepared = false;
		}
	};

	return write;
};

export default writer;
