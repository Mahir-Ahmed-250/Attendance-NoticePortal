const http = require('http');

function post(path, body) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 500, error: e.message }));
    req.write(payload);
    req.end();
  });
}

function put(path, body) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 500, error: e.message }));
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log("1. Logging in with manager@portal.com / password...");
  const login1 = await post('/api/auth/login', { email: 'manager@portal.com', password: 'password' });
  console.log("Login 1 Status:", login1.status, login1.data);

  if (login1.status !== 200) {
    console.error("Login 1 failed!");
    return;
  }

  const user = login1.data.user;

  console.log("2. Updating password to 'newpassword123'...");
  const updateRes = await put(`/api/users/${user.pin}`, { ...user, password: 'newpassword123' });
  console.log("Update Status:", updateRes.status, updateRes.data);

  console.log("3. Tying to log in with NEW password...");
  const login2 = await post('/api/auth/login', { email: 'manager@portal.com', password: 'newpassword123' });
  console.log("Login 2 (NEW PASS) Status:", login2.status, login2.data);

  console.log("4. Trying to log in with OLD password 'password'...");
  const login3 = await post('/api/auth/login', { email: 'manager@portal.com', password: 'password' });
  console.log("Login 3 (OLD PASS) Status:", login3.status, login3.data);

  // Restore password back to 'password' for future tests or usage
  console.log("5. Restoring password back to 'password'...");
  const restoreRes = await put(`/api/users/${user.pin}`, { ...user, password: 'password' });
  console.log("Restore Status:", restoreRes.status);
}

run().catch(console.error);
