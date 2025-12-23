const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database('./cinema.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER,
        seat_index INTEGER,
        user_name TEXT,
        user_email TEXT,
        UNIQUE(movie_id, seat_index)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        price INTEGER
    )`);

    db.get("SELECT count(*) as count FROM movies", (err, row) => {
        if (row && row.count === 0) {
            const stmt = db.prepare("INSERT INTO movies (title, price) VALUES (?, ?)");
            stmt.run("Аватар: Шлях води", 150);
            stmt.run("Дюна. Частина друга", 120);
            stmt.run("Месники: Фінал", 200);
            stmt.finalize();
            console.log("Стартові фільми додано.");
        }
    });
});

app.get('/api/movies', (req, res) => {
    db.all("SELECT * FROM movies", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/movies', (req, res) => {
    const { title, price } = req.body;
    if (!title || !price) return res.status(400).json({ error: "Вкажіть дані" });

    const stmt = db.prepare("INSERT INTO movies (title, price) VALUES (?, ?)");
    stmt.run(title, price, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, title, price, status: 'success' });
    });
    stmt.finalize();
});

app.get('/api/seats/:movieId', (req, res) => {
    const movieId = req.params.movieId;
    const sql = `SELECT seat_index FROM bookings WHERE movie_id = ?`;
    db.all(sql, [movieId], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows.map(row => row.seat_index));
    });
});


app.post('/api/book', (req, res) => {
    const { movieId, seats, name, email } = req.body;
    const stmt = db.prepare(`INSERT INTO bookings (movie_id, seat_index, user_name, user_email) VALUES (?, ?, ?, ?)`);
    
    let errors = [];
    seats.forEach(seatIndex => {
        stmt.run(movieId, seatIndex, name, email, (err) => {
            if (err) errors.push(err.message);
        });
    });
    stmt.finalize();

    setTimeout(() => {
        if (errors.length > 0) {
            res.status(400).json({ status: 'error', message: 'Місця вже зайняті', errors });
        } else {
            res.json({ status: 'success', message: 'Успішно!' });
        }
    }, 500);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});