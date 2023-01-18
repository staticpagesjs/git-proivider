import { reader } from '../esm/index.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const repository = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const branch = 'master';
const cwd = 'tests/input';

test('it reads the specified files and parses its contents', async () => {
	const expected = [{ body: 'hello file1' }, { body: 'hello file2' }];

	const asyncIterable = reader({
		repository,
		branch,
		cwd,
		branch: 'master',
		pattern: ['file1.txt', 'file2.txt'],
		parser(body) {
			return { body: 'hello ' + body.toString().trim() };
		}
	});

	const output = [];
	for await (const item of asyncIterable) {
		output.push(item);
	}

	output.sort((a, b) => a.body.localeCompare(b.body));

	expect(output).toEqual(expected);
});
