const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// In-memory "database" for the demo
let buses = {
    'BUS-01': { lat: 5.348, lng: -4.011, occupancy: 12, status: 'On Route' },
    'BUS-02': { lat: 5.350, lng: -4.015, occupancy: 3, status: 'Idle' }
};

// Helper: return array of buses with id property
function listBuses() {
    return Object.entries(buses).map(([id, info]) => ({ id, ...info }));
}

// 1. API: Driver Reports Status (accepts either {busId,...} or {id,...})
app.post('/api/report-status', (req, res) => {
    const { busId, id, status, occupancy } = req.body;
    const key = busId || id;
    if (!key) return res.status(400).send({ error: 'Missing bus id' });
    if (!buses[key]) return res.status(404).send({ error: 'Bus not found' });

    buses[key].status = typeof status === 'string' ? status : buses[key].status;
    buses[key].occupancy = occupancy != null ? Number(occupancy) : buses[key].occupancy;

    const payload = { id: key, status: buses[key].status, occupancy: buses[key].occupancy };
    io.emit('statusUpdate', payload);
    io.emit('busUpdate', { id: key, ...buses[key] });
    return res.send({ message: 'Status updated', bus: payload });
});

// Backwards-compatible alias used by some clients
app.post('/api/update-status', (req, res) => {
    return app._router.handle(req, res);
});

// 2. API: Return current buses
app.get('/api/buses', (req, res) => {
    res.json(listBuses());
});

// 3. WebSocket: Live Location Updates
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Send initial snapshot to the connecting client
    socket.emit('initialBuses', listBuses());

    socket.on('updateLocation', (data) => {
        // Accept either { busId, lat, lng } or { id, lat, lng }
        const busId = data.busId || data.id;
        const { lat, lng } = data;
        if (!busId || lat == null || lng == null) return;

        if (!buses[busId]) {
            // Optionally create a new bus entry
            buses[busId] = { lat, lng, occupancy: 0, status: 'On Route' };
        } else {
            buses[busId].lat = lat;
            buses[busId].lng = lng;
        }

        io.emit('busMoved', { id: busId, lat: buses[busId].lat, lng: buses[busId].lng });
        io.emit('busUpdate', { id: busId, ...buses[busId] });
    });

    socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));