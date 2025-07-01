-- Create players table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert all the players
INSERT INTO players (name) VALUES 
('Adam S.'),
('Adam T.'),
('Andrzej T.'),
('Bartek D.'),
('Franek W.'),
('Grzegorz O.'),
('Konrad L.'),
('Krystian G.'),
('Łukasz J.'),
('Maciej M.'),
('Marcin P.'),
('Marek Z.'),
('Michał G.'),
('Mikołaj T.'),
('Oskar B.'),
('Paweł L.'),
('Piotrek P.'),
('Przemek W.'),
('Radek K.'),
('Radek P.'),
('Robert G.'),
('Tomek Ł.'),
('Tomek W.'),
('Michał T.'),
('Mateusz W.'),
('Kornel O.'),
('Tomasz Ł.'),
('Łukasz B.'),
('Jędrek K.'),
('Szymon B.'),
('Kamil E.'),
('Paweł W.'),
('Grzegorz G.'),
('Jakub K.')
ON CONFLICT (name) DO NOTHING;
