(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: 1, total: 123.45 })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log(text);
  } catch (e) {
    console.error('Request failed:', e);
    process.exit(1);
  }
})();


