const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'mock-server');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
  console.log('Created mock-server directory');
} else {
  console.log('Directory already exists');
}
