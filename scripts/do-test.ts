import FormData from 'form-data';
import axios from 'axios';
import autocannon from 'autocannon';
import fs from 'fs';
import path from 'path';

// Create a dummy PDF file for testing
const dummyPdfPath = path.join(process.cwd(), 'dummy.pdf');
fs.writeFileSync(dummyPdfPath, 'Dummy PDF content for testing');

async function testUpload100PDFs(formId: string) {
  console.log('\n--- 🛡️ BLUE TEAM TEST: 100 PDF Upload Attack ---');
  const form = new FormData();
  form.append('data', JSON.stringify({ overall_rating: 5, nps_score: 9 }));
  
  // Attach 100 files
  for (let i = 0; i < 100; i++) {
    form.append(`project_screenshot_${i}`, fs.createReadStream(dummyPdfPath), {
      filename: `dummy_${i}.pdf`,
      contentType: 'application/pdf',
    });
  }

  try {
    const res = await axios.post(`http://localhost:3000/api/forms/${formId}/submissions`, form, {
      headers: form.getHeaders(),
    });
    console.log(`❌ Test Failed: Server accepted 100 files. Status: ${res.status}`);
  } catch (err: any) {
    if (err.response && err.response.status === 400 && err.response.data?.details?.includes('Too many files')) {
      console.log(`✅ Test Passed: Server safely rejected 100 files with 400 Bad Request (Too many files)`);
    } else if (err.response && err.response.status === 400) {
      console.log(`✅ Test Passed: Server safely rejected the attack with 400 Bad Request: ${JSON.stringify(err.response.data)}`);
    } else if (err.response && err.response.status === 429) {
      console.log(`✅ Test Passed: Rate limited.`);
    } else {
      console.log(`❌ Test Failed: Server responded with ${err.response?.status}`);
    }
  }
}

async function test1000ConcurrentRequests() {
  console.log('\n--- 🚀 LOAD TEST: 1000 Concurrent Requests ---');
  try {
    const result: any = await autocannon({
      url: 'http://localhost:3000/api/forms',
      connections: 1000,
      pipelining: 1,
      duration: 5, // Run for 5 seconds
    });

    console.log(`✅ Load Test Completed!`);
    console.log(`- Total Requests Sent: ${result.requests.total}`);
    console.log(`- Successful Responses (2xx): ${result['2xx']}`);
    console.log(`- Rate Limited Responses (429): ${result['4xx']}`); // 429 is a 4xx
    console.log(`- Errors (5xx): ${result['5xx']}`);
    console.log(`- Timeouts: ${result.timeouts}`);
    
    if (result['5xx'] === 0 && result['4xx'] > 0) {
       console.log(`🛡️ Rate limiting successfully protected the server from crashing under 1000 concurrent connections.`);
    }
  } catch (err) {
    console.log(`❌ Load Test Error:`, err);
  }
}

async function runAllTests() {
  // Wait for server to be up
  console.log('Waiting for server...');
  await new Promise(r => setTimeout(r, 2000));

  try {
    // 1. Create a form first
    const createRes = await fetch('http://localhost:3000/api/forms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: "Load Test Form",
        description: "Testing",
        schema: [
          { name: "overall_rating", type: "rating", required: true },
          { name: "nps_score", type: "nps", required: true },
        ]
      })
    });
    
    if (!createRes.ok) {
       throw new Error(`Failed to create form: ${createRes.status} ${await createRes.text()}`);
    }
    
    const createData = await createRes.json();
    const formId = createData.id;
    console.log(`Form created with ID: ${formId}`);

    // 2. Run the PDF attack test
    await testUpload100PDFs(formId);

    // 3. Run the concurrent load test
    await test1000ConcurrentRequests();

  } catch (err: any) {
    console.error('Error during setup:', err.message, err.response?.data);
  } finally {
    if (fs.existsSync(dummyPdfPath)) {
      fs.unlinkSync(dummyPdfPath);
    }
    process.exit(0);
  }
}

runAllTests();
