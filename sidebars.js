import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const sidebarsDir = path.join(__dirname, 'sidebars');
const sidebars    = {};

if (fs.existsSync(sidebarsDir)) {
  for (const file of fs.readdirSync(sidebarsDir)) {
    if (file.endsWith('.json')) {
      const content = fs.readFileSync(path.join(sidebarsDir, file), 'utf8');
      Object.assign(sidebars, JSON.parse(content));
    }
  }
}

export default sidebars;
