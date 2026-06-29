// Test login and upload with proper error handling
async function test() {
  const API = 'https://college-admin-portal-zdet.onrender.com/api';

  // Step 1: Test if /api/auth/login returns JSON
  console.log('=== Testing /api/auth/login ===');
  try {
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    });
    console.log('Status:', loginRes.status);
    console.log('Content-Type:', loginRes.headers.get('content-type'));
    const text = await loginRes.text();
    console.log('Response (first 300 chars):', text.substring(0, 300));
  } catch (err) {
    console.log('Error:', err.message);
  }

  // Step 2: Test health endpoint
  console.log('\n=== Testing /health ===');
  try {
    const healthRes = await fetch('https://college-admin-portal-zdet.onrender.com/health');
    const healthData = await healthRes.json();
    console.log('Health:', JSON.stringify(healthData));
  } catch (err) {
    console.log('Error:', err.message);
  }
}

test();
