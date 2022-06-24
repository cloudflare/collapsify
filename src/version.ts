import {readFileSync} from 'node:fs';

const contents = readFileSync(new URL('../package.json', import.meta.url));
const packageJson = contents.toJSON() as any;

export default packageJson.version;
