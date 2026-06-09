-- Core tables
CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT, role TEXT); -- 'student', 'staff', 'driver'
CREATE TABLE buses (
    id SERIAL PRIMARY KEY,
    bus_number TEXT,
    route_name TEXT,
    capacity INTEGER,
    current_occupancy INTEGER DEFAULT 0,
    status TEXT -- 'on-route', 'idle', 'incident'
);
CREATE TABLE locations (
    bus_id INTEGER REFERENCES buses(id),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);