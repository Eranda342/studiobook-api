const baseUrl = 'http://localhost:3000/api';
let token = '';
let serviceId = '';
let bookingId = '';
let fakeServiceId = '00000000-0000-0000-0000-000000000000';

async function test() {
  console.log('--- Auth ---');
  let res = await fetch(baseUrl + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@studiobook.com', password: 'password123' }), headers: { 'Content-Type': 'application/json' }});
  let data = await res.json();
  token = data.accessToken;
  console.log('Got token:', !!token);

  console.log('--- Fetching active service ---');
  res = await fetch(baseUrl + '/services', { method: 'POST', body: JSON.stringify({ title: 'Test Booking Service', description: 'Testing bookings', duration: 60, price: 50, isActive: true }), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }});
  data = await res.json();
  serviceId = data.id;
  console.log('Service ID:', serviceId);

  console.log('\nA. Create booking for non-existing service');
  res = await fetch(baseUrl + '/bookings', { method: 'POST', body: JSON.stringify({ customerName: 'Alex Carter', customerEmail: 'alex@example.com', serviceId: fakeServiceId, bookingDate: '2026-07-20', bookingTime: '14:00' }), headers: { 'Content-Type': 'application/json' }});
  console.log('A (404 expected):', res.status);

  console.log('\nB. Create booking with past date');
  res = await fetch(baseUrl + '/bookings', { method: 'POST', body: JSON.stringify({ customerName: 'Alex Carter', customerEmail: 'alex@example.com', serviceId, bookingDate: '2020-07-20', bookingTime: '14:00' }), headers: { 'Content-Type': 'application/json' }});
  console.log('B (400 expected):', res.status);

  console.log('\nC. Create valid booking without token');
  res = await fetch(baseUrl + '/bookings', { method: 'POST', body: JSON.stringify({ customerName: 'Alex Carter', customerEmail: 'alex@example.com', customerPhone: '+94771234567', serviceId, bookingDate: '2026-07-20', bookingTime: '14:00', notes: 'Need two mics.' }), headers: { 'Content-Type': 'application/json' }});
  data = await res.json();
  bookingId = data.id;
  console.log('C (201 expected):', res.status, 'Booking ID:', bookingId);

  console.log('\nD. Create duplicate booking');
  res = await fetch(baseUrl + '/bookings', { method: 'POST', body: JSON.stringify({ customerName: 'Duplicate Alex', customerEmail: 'alex2@example.com', serviceId, bookingDate: '2026-07-20', bookingTime: '14:00' }), headers: { 'Content-Type': 'application/json' }});
  console.log('D (409 expected):', res.status);

  console.log('\nE. Get all bookings without token');
  res = await fetch(baseUrl + '/bookings');
  console.log('E (401 expected):', res.status);

  console.log('\nF. Get all bookings with token');
  res = await fetch(baseUrl + '/bookings', { headers: { Authorization: 'Bearer ' + token }});
  data = await res.json();
  console.log('F (200 expected):', res.status, 'Meta:', !!data.meta, 'Total:', data.meta?.total);

  console.log('\nG. Get booking by id with token');
  res = await fetch(baseUrl + '/bookings/' + bookingId, { headers: { Authorization: 'Bearer ' + token }});
  console.log('G (200 expected):', res.status);

  console.log('\nH. Update booking status to CONFIRMED');
  res = await fetch(baseUrl + '/bookings/' + bookingId + '/status', { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }});
  data = await res.json();
  console.log('H (200 expected):', res.status, 'Status:', data.status);

  console.log('\nI. Cancel booking');
  res = await fetch(baseUrl + '/bookings/' + bookingId + '/cancel', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token }});
  data = await res.json();
  console.log('I (200 expected):', res.status, 'Status:', data.status);

  console.log('\nJ. Try to mark cancelled booking as COMPLETED');
  res = await fetch(baseUrl + '/bookings/' + bookingId + '/status', { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }});
  console.log('J (400 expected):', res.status);

  console.log('\nK. Test status filter');
  res = await fetch(baseUrl + '/bookings?status=CANCELLED', { headers: { Authorization: 'Bearer ' + token }});
  data = await res.json();
  console.log('K (200 expected):', res.status, 'Count:', data.data?.length);

  console.log('\nL. Test search filter');
  res = await fetch(baseUrl + '/bookings?search=alex', { headers: { Authorization: 'Bearer ' + token }});
  data = await res.json();
  console.log('L (200 expected):', res.status, 'Count:', data.data?.length);

  console.log('\nM. Test pagination');
  res = await fetch(baseUrl + '/bookings?page=1&limit=5', { headers: { Authorization: 'Bearer ' + token }});
  data = await res.json();
  console.log('M (200 expected):', res.status, 'Limit returned:', data.meta?.limit);
}
test().catch(console.error);
