CREATE TABLE Sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(200),
    status VARCHAR(50) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE Installations (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES Sites(id) ON DELETE CASCADE,
    equipment_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT
);

CREATE INDEX idx_installations_site_id ON Installations(site_id);
CREATE INDEX idx_installations_status ON Installations(status);
CREATE INDEX idx_sites_status ON Sites(status);
