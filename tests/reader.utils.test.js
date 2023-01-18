import { findAll, findByGlob, findChangedByGlob, findChangedOrTriggeredByGlob, parseHeader } from '../esm/index.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const repository = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const branch = 'master';
const cwd = 'tests/input';

test('findAll() reads everything and possible to filter', async () => {
	const expected = ['file1.txt', 'file2.txt', 'folder/file3.txt'];

	const output = [...findAll({
		repository,
		branch,
		cwd,
		filter: x => !x.includes('skip.txt'),
	})];

	output.sort((a, b) => a.localeCompare(b));

	expect(output).toEqual(expected);
});

test('findByGlob() reads by pattern and possible to filter and ignore', async () => {
	const expected = ['file1.txt'];

	const output = [...findByGlob({
		repository,
		branch,
		cwd,
		pattern: '*.txt',
		ignore: 'skip.txt',
		filter: x => !x.endsWith('2.txt'),
	})];

	output.sort((a, b) => a.localeCompare(b));

	expect(output).toEqual(expected);
});

test('findChangedByGlob() filters newer files only', async () => {
	const expected = []; // TODO: make test files appear in git history in a separate commit after initial commit.

	const last = '068ed566dbbc4f45afbecd45ac2d7bf1d0cc364b'; // the initial commit hash

	const incremental = {
		last: null,
		get() { return last; },
		set(d) { incremental.last = d; }
	};

	const asyncIterable = findChangedByGlob({
		repository,
		branch,
		cwd,
		pattern: '*.txt',
		ignore: 'skip.txt',
		storage: incremental,
	});

	const output = [];
	for await (const item of asyncIterable) {
		output.push(item);
	}

	output.sort((a, b) => a.localeCompare(b));

	expect(output).toEqual(expected);
	expect(incremental.last).not.toBeNull();
});

test('findChangedOrTriggeredByGlob() filters newer files plus triggered ones only', async () => {
	const expected = []; // TODO: make test files appear in git history in a separate commit after initial commit.

	const last = '068ed566dbbc4f45afbecd45ac2d7bf1d0cc364b'; // the initial commit hash

	const incremental = {
		last: null,
		get() { return last; },
		set(d) { incremental.last = d; }
	};

	const asyncIterable = findChangedOrTriggeredByGlob({
		repository,
		branch,
		cwd,
		pattern: '**/*.txt',
		ignore: 'skip.txt',
		storage: incremental,
		triggers: {
			'*1.txt': 'folder/*'
		}
	});

	const output = [];
	for await (const item of asyncIterable) {
		output.push(item);
	}

	output.sort((a, b) => a.localeCompare(b));

	expect(output).toEqual(expected);
	expect(incremental.last).not.toBeNull();
});

test('parseHeader() makes a standard page object with header', async () => {
	const expected = {
		header: {
			repository: repository.replace(/\\/g, '/'),
			branch,
			cwd,
			path: 'folder/file3.txt',
			dirname: 'folder',
			basename: 'file3',
			extname: '.txt'
		},
		body: 'hello world'
	};

	const parser = parseHeader(b => JSON.parse(b.toString()));

	const output = parser(Buffer.from('{"body":"hello world"}'), 'folder/file3.txt', { cwd, branch, repository });

	expect(output).toMatchObject(expected);
	expect(output.header.latestCommit).toBeDefined();
});
