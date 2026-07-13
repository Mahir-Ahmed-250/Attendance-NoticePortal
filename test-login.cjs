const http = require('http');

function testLogin(email, password) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ email, password });
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: JSON.parse(data)
        });
      });
    });

    req.on('error', (e) => {
      resolve({ status: 500, error: e.message });
    });

    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log("1. Testing login with non-existent user...");
  const res1 = await testLogin("nonexistent_user_123", "password");
  console.log("Result 1:", res1);

  console.log("2. Testing login with existing user '5110' but wrong password...");
  const res2 = await testLogin("5110", "wrong_password_abc");
  console.log("Result 2:", res2);

  console.log("3. Testing login with empty password...");
  const res3 = await testLogin("5110", "");
  console.log("Result 3:", res3);
}

run().catch(console.error);
