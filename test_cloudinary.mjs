// Test Cloudinary upload directly from Node.js
// This mimics exactly what the backend does

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function testUpload() {
  // Create a small test buffer (simulating a small text file)
  const testContent = Buffer.from('Hello World - test upload from Node.js');
  const fileName = 'test_upload.txt';
  const mimeType = 'text/plain';

  console.log('=== Test 1: FormData with Blob (current backend approach) ===');
  try {
    const blob = new Blob([testContent], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('upload_preset', 'myvault_unsigned');

    const uploadRes = await fetch('https://api.cloudinary.com/v1_1/dtdb4irno/raw/upload', {
      method: 'POST',
      body: formData
    });
    const data = await uploadRes.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    if (data.secure_url) {
      console.log('SUCCESS! URL:', data.secure_url);
    } else {
      console.log('FAILED:', data.error?.message || JSON.stringify(data));
    }
  } catch (err) {
    console.log('ERROR:', err.message);
  }

  console.log('\n=== Test 2: Base64 data URI with URLSearchParams (old approach) ===');
  try {
    const base64File = `data:${mimeType};base64,${testContent.toString('base64')}`;
    const uploadRes = await fetch('https://api.cloudinary.com/v1_1/dtdb4irno/raw/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ file: base64File, upload_preset: 'myvault_unsigned' })
    });
    const data = await uploadRes.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    if (data.secure_url) {
      console.log('SUCCESS! URL:', data.secure_url);
    } else {
      console.log('FAILED:', data.error?.message || JSON.stringify(data));
    }
  } catch (err) {
    console.log('ERROR:', err.message);
  }
}

testUpload();
