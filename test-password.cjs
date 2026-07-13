const http = require('http');

async function test() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  
  // Update password for manager-1
  const updateRes = await fetch('http://localhost:3000/api/users/manager-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'newpassword123' })
  });
  console.log('Update res status:', updateRes.status);
  
  // Try login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager-1', password: 'newpassword123' })
  });
  console.log('Login res status:', loginRes.status);
  const data = await loginRes.json();
  console.log('Login result:', data);
}

test();
