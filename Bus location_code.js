// Simple bus location simulator for local testing
// Usage: node "Bus location_code.js" [BUS-ID]
// Requires: npm install socket.io-client  (and run backend on http://localhost:3000)

const io = require('socket.io-client');
const fetch = global.fetch; // Node 18+ may have fetch; otherwise use a separate request tool

const SERVER = process.env.SERVER_URL || 'http://localhost:3000';
const busId = process.argv[2] || 'BUS-01';

const socket = io(SERVER);

let lat = 5.348;
let lng = -4.011;

socket.on('connect', () => {
	console.log('Connected to server', SERVER);
	// send an initial location
	socket.emit('updateLocation', { busId, lat, lng });
});

setInterval(() => {
	// small random walk
	lat += (Math.random() - 0.5) * 0.001;
	lng += (Math.random() - 0.5) * 0.001;
	socket.emit('updateLocation', { busId, lat, lng });
	console.log(new Date().toISOString(), 'sent location', { busId, lat, lng });
}, 2000);

// Periodically report occupancy/status via HTTP if fetch is available
setInterval(async () => {
	const occupancy = Math.max(0, Math.floor(20 * Math.abs(Math.sin(Date.now() / 60000))));
	const status = occupancy > 15 ? 'Full' : 'On Route';
	if (typeof fetch === 'function') {
		try {
			await fetch(`${SERVER}/api/report-status`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ busId, status, occupancy })
			});
			console.log('Reported status', { busId, status, occupancy });
		} catch (err) {
			console.error('Failed to report status:', err.message || err);
		}
	} else {
		console.log('Fetch not available in this Node version; skipping HTTP status report');
	}
}, 10000);

process.on('SIGINT', () => {
	console.log('Shutting down simulator');
	socket.close();
	process.exit(0);
});
