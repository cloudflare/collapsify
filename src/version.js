import {readFileSync} from 'node:fs';

const contents = readFileSync(new URL('../package.json', import.meta.url));
const packageJson = JSON.parse(contents);

export default packageJson.version;
