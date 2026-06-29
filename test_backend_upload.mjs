// End-to-end test: login then upload a file
async function test() {
  const API = 'https://college-admin-portal-zdet.onrender.com/api';

  // Step 1: Login as admin
  console.log('=== Step 1: Admin Login ===');
  const loginRes = await fetch(`${API}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nitw.ac.in', password: 'password123' })
  });
  console.log('Login status:', loginRes.status);
  const loginText = await loginRes.text();
  console.log('Login response:', loginText.substring(0, 500));

  let token;
  try {
    const loginData = JSON.parse(loginText);
    token = loginData.token;
  } catch (e) {
    console.log('Could not parse login response as JSON');
    return;
  }

  if (!token) {
    console.log('No token received. Exiting.');
    return;
  }
  console.log('Token:', token.substring(0, 30) + '...');

  // Step 2: Upload a small test file
  console.log('\n=== Step 2: Upload Test File ===');
  const testContent = Buffer.from('%PDF-1.4 test content for upload validation');
  const blob = new Blob([testContent], { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('title', 'Test Upload via Script');
  formData.append('description', 'Automated test upload');
  formData.append('contentType', 'notes');
  formData.append('departmentId', 'ECE');
  formData.append('subject', 'WSN');
  formData.append('semester', '1');
  formData.append('yearTarget', '1');
  formData.append('file', blob, 'test_file.pdf');

  const uploadRes = await fetch(`${API}/admin/content`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  console.log('Upload status:', uploadRes.status);
  console.log('Upload content-type:', uploadRes.headers.get('content-type'));
  const uploadText = await uploadRes.text();
  console.log('Upload response:', uploadText.substring(0, 1000));
}

test().catch(err => console.error('Script error:', err));
