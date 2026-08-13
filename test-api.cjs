const http = require('http');

const testEndpoint = (path) => {
  return new Promise((resolve) => {
    const start = Date.now();
    http.get('http://localhost:3000' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ path, time: Date.now() - start, size: data.length });
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
  const promises = endpoints.map(testEndpoint);
  const results = await Promise.all(promises);
  for (const res of results) {
    console.log(res);
  }
}
run();
