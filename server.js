const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');

// Create a new Express application
const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// PostgreSQL connection setup
const pool = new Pool({
    user: 'bet_owner',
    host: 'ep-wispy-frog-a5kfl7yf.us-east-2.aws.neon.tech',
    database: 'bet',
    password: '9FJR6kNimfIt', // Make sure this is a string
    port: 5432,
    ssl: {
        rejectUnauthorized: false, // Only for local testing with self-signed certificate
    }
});

// Handle connection errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// API endpoint to create a new user
app.post('/api/users', async (req, res) => {
    const { login, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (login, password) VALUES ($1, crypt($2, gen_salt(\'bf\'))) RETURNING *',
            [login, password]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            res.status(409).json({ error: 'Duplicate key value violates unique constraint.' });
        } else {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// API endpoint to authenticate a user
app.post('/api/authenticate', async (req, res) => {
    const { login, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE login = $1 AND password = crypt($2, password)',
            [login, password]
        );
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'Authentication successful' });
        } else {
            res.status(401).json({ message: 'Invalid login or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// API endpoint to add money to user's balance
app.put('/api/users/:userId/add-money', async (req, res) => {
    const userId = req.params.userId;
    const { amount } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING *',
            [amount, userId]
        );
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'Money added successfully', user: result.rows[0] });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API endpoint to take money from user's balance
app.put('/api/users/:userId/take-money', async (req, res) => {
    const userId = req.params.userId;
    const { amount } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING *',
            [amount, userId]
        );
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'Money taken successfully', user: result.rows[0] });
        } else {
            res.status(400).json({ error: 'Insufficient balance or user not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// API endpoint to get all users
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM users'
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

async function addSlipBet(match_info,price,userid,  totalcote, totalbonus, totalwin,login) {
    try {
        const query = `
            INSERT INTO slipbet (match_info,price,userid,  totalcote, totalbonus, totalwin,login)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [match_info,price,userid,  totalcote, totalbonus, totalwin,login];

        const result = await pool.query(query, values);
        // console.log('Record added successfully:', result.rows[0]);
        return result.rows[0];
    } catch (error) {
        console.error('Error adding record:', error);
        throw error;
    }
}

// POST endpoint to add a record to the "slipbet" table
app.post('/api/addSlipBet', async (req, res) => {
    const {match_info,price, userid,  totalcote, totalbonus, totalwin, login } = req.body;
    
    try {
        const record = await addSlipBet(match_info,price, userid, totalcote, totalbonus, totalwin, login);
        res.json({ success: true, data: record });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error adding record' });
    }
});

app.get('/api/slipbets', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM slipbet'
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Assuming you have already defined your pool object for database connection

app.get('/api/users/:login', async (req, res) => {
    const { login } = req.params; // Get the login from request parameters
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE login = $1',
            [login]
        );
        
        // Check if a user with the provided login exists
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return the user data
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/events', async (req, res) => {
    const { name, liveTime, score } = req.body;
    try {
        const client = await pool.connect();
        console.log(name,'name')
        console.log(score, 'score')
        console.log(liveTime, 'liveTime')
        const result = await client.query(
            'INSERT INTO events (name, live_time, score) VALUES ($1, $2, $3) RETURNING *',
            [name, liveTime, score]
        );
        const insertedEvent = result.rows[0];
        client.release();
        res.json(insertedEvent);
    } catch (error) {
        console.error('Error inserting event into database:', error);
        res.status(500).json({ error: 'An error occurred while saving the event data.' });
    }
});
app.get('/api/events', async (req, res) => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM events');
      const events = result.rows;
      client.release();
      console.log(events)
      res.json(events);
    } catch (err) {
      console.error('Error fetching events:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
