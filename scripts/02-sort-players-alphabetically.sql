-- First, let's see the current players (for reference)
-- SELECT name FROM players ORDER BY name;

-- Drop the existing table and recreate with alphabetically sorted players
DROP TABLE IF EXISTS players;

-- Create players table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert all the players in alphabetical order
INSERT INTO players (name) VALUES 
('Adam S.'),
('Adam T.'),
('Andrzej T.'),
('Bartek D.'),
('Franek W.'),
('Grzegorz G.'),
('Grzegorz O.'),
('Jakub K.'),
('Jędrek K.'),
('Kamil E.'),
('Konrad L.'),
('Kornel O.'),
('Krystian G.'),
('Łukasz B.'),
('Łukasz J.'),
('Maciej M.'),
('Marcin P.'),
('Marek Z.'),
('Mateusz W.'),
('Michał G.'),
('Michał T.'),
('Mikołaj T.'),
('Oskar B.'),
('Paweł L.'),
('Paweł W.'),
('Piotrek P.'),
('Przemek W.'),
('Radek K.'),
('Radek P.'),
('Robert G.'),
('Szymon B.'),
('Tomasz Ł.'),
('Tomek Ł.'),
('Tomek W.')
ON CONFLICT (name) DO NOTHING;

-- Verify the alphabetical order
SELECT name FROM players ORDER BY name;
