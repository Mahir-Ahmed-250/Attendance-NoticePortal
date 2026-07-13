const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, 'src/assets/logo.jpg');
const logoBuffer = fs.readFileSync(logoPath);
const base64Logo = logoBuffer.toString('base64');
const dataUrl = `data:image/jpeg;base64,${base64Logo}`;

console.log(dataUrl);
