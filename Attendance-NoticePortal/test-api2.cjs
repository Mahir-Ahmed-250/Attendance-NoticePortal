const http = require('http');

const testEndpoint = (path) => {
  return new Promise((resolve) => {
    const start = Date.now();
    http.get('http://localhost:3000' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const time = Date.now() - start;
        console.log({ path, time, size: data.length });
        resolve();
      });
    });
  });
};

async function run() {
  const endpoints = [
    '/api/reports',
    '/api/users',
    '/api/notices',
    '/api/feedbacks',
    '/api/profile-requests',
    '/api/attendance-edit-requests',
    '/api/leave-requests',
    '/api/emails',
    '/api/campuses',
    '/api/branches'
  ];
  for (const ep of endpoints) {
    await testEndpoint(ep);
  }
}
run();
