import {readFileSync} from 'node:fs';

interface PackageJson {
  version: string;
}

const contents = readFileSync(new URL('../package.json', import.meta.url), {
  encoding: 'utf8',
});
const packageJson: PackageJson = JSON.parse(contents) as PackageJson;

export default packageJson.version;
