const fs = require('fs');
const path = require('path');

const TOPICS = ['queues', 'publish-subscribe', 'kafka', 'rabbitmq',
                'event-driven-architecture', 'event-sourcing', 'cqrs', 'saga-pattern'];

let converted = 0;
let backtickFixed = 0;

for (const topic of TOPICS) {
  const dir = `docs/system-design-fundamentals/${topic}`;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

  for (const file of files) {
    const filepath = path.join(dir, file);
    let text = fs.readFileSync(filepath, 'utf-8');
    const original = text;
    text = text.replace(/\r\n/g, '\n');

    // CASE 1: Children format: <AsciiDiagram ...>\n{`\ncontent\n`}\n</AsciiDiagram>
    let newText = text.replace(
      /(<AsciiDiagram[\s\S]*?<\/AsciiDiagram>)/g,
      (block) => {
        // Check if this is the children format
        const m = block.match(/^<AsciiDiagram\s*\n((?:\s+\w+="[^"]*"\s*\n)*)\s*>\s*\n\{`\n([\s\S]*?)`\}\s*\n<\/AsciiDiagram>$/);
        if (!m) return block;  // already converted or not a match

        const [, propsStr, rawContent] = m;

        // Parse props
        const props = {};
        const propRe = /(\w+)="([^"]*)"/g;
        let p;
        while ((p = propRe.exec(propsStr)) !== null) props[p[1]] = p[2];

        let result = '<AsciiDiagram\n';
        result += `  id="${props.id || ''}"\n`;
        result += `  title="${props.title || ''}"\n`;
        result += `  content={\n\`\n${rawContent}\n\`}\n`;
        result += `  alt="${props.alt || ''}"\n`;
        if (props.caption) result += `  caption="${props.caption}"\n`;
        result += '/>';

        converted++;
        return result;
      }
    );

    // CASE 2: content= format but missing backticks: content={\n┌────\n  }
    if (newText === original) {
      // Check for content={ followed by diagram chars (no backtick)
      newText = newText.replace(
        /content=\{\n(┌[\s\S]*?)\n  \}/g,
        (match, content) => {
          backtickFixed++;
          return 'content={\n`\n' + content.trimEnd() + '\n`\n  }';
        }
      );
    }

    if (newText !== original) {
      fs.writeFileSync(filepath, newText, 'utf-8');
      console.log(`UPDATED: ${file}`);
    }
  }
}

console.log(`\nConverted ${converted} children-format diagrams`);
console.log(`Fixed ${backtickFixed} content= blocks with missing backticks`);