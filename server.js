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


app.put('/update-match-info', async (req, res) => {
    const { outcomes, state, names, selectedBetIds } = req.body;
  
    try {
      // Example query: Update match_info in slip_bet table
      const updateQuery = `
       UPDATE slip_bet
  SET match_info = jsonb_set(match_info, '{outcomes}', to_jsonb($1), true),
      state = $2,
      names = $3
  WHERE ids = $4
      `;
  
      // Execute the query
      const updateResult = await pool.query(updateQuery, [outcomes, state, names, selectedBetIds]);
  
      // Check if update was successful
      if (updateResult.rowCount > 0) {
        res.status(200).json({ success: true, message: 'Match info updated successfully' });
      } else {
        res.status(404).json({ success: false, message: 'Match not found or update failed' });
      }
    } catch (error) {
      console.error('Error updating match_info:', error);
      res.status(500).json({ success: false, message: 'Failed to update match info' });
    }
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

app.post('/api/my', async (req, res) => {
    const { login, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (login, password, my ) VALUES ($1, crypt($2, gen_salt(\'bf\')), TRUE) RETURNING *',
            [login, password ]
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


app.post('/api/admins', async (req, res) => {
    const { login, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (login, password, admin ) VALUES ($1, crypt($2, gen_salt(\'bf\')), TRUE) RETURNING *',
            [login, password ]
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

app.post('/api/shops', async (req, res) => {
    const { login, password, admin_name } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (login, password, shop, admin_name) VALUES ($1, crypt($2, gen_salt(\'bf\')), TRUE, $3) RETURNING *',
            [login, password, admin_name]
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

app.post('/api/shop-users', async (req, res) => {
    const { login, password, admin_name, shop_name } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (login, password, admin_name, shop_name) VALUES ($1, crypt($2, gen_salt(\'bf\')), $3, $4) RETURNING *',
            [login, password, admin_name, shop_name]
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


app.post('/api/authenticate', async (req, res) => {
    const { login, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT login, admin_name, shop_name FROM users WHERE login = $1 AND password = crypt($2, password)',
            [login, password]
        );
        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.status(200).json(user); // Return the user details
        } else {
            res.status(401).json({ error: 'Invalid login or password' });
        }
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/authenticat', async (req, res) => {
    const { login, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id, login, admin , shop FROM users WHERE login = $1 AND password = crypt($2, password)',
            [login, password]
        );
        if (result.rows.length > 0) {
            const user = result.rows[0];
            // Determine if user is admin or shop owner
            const isAdmin = user.admin ? true : false;
            const isShopOwner = user.shop ? true : false;
            res.status(200).json({ id: user.id, login: user.login, admin: isAdmin, shop: isShopOwner });
        } else {
            res.status(401).json({ error: 'Invalid login or password' });
        }
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/api/slipbets/:betId/update-status', async (req, res) => {
    const betId = req.params.betId;
    try {
        const result = await pool.query(
            'UPDATE slipbet SET status = true WHERE ids = $1 RETURNING *',
            [betId]
        );
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'Status updated successfully', bet: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Bet not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/api/slipbets/:betId/update-statusfalse', async (req, res) => {
    const betId = req.params.betId;
    try {
        const result = await pool.query(
            'UPDATE slipbet SET statusfalse = true WHERE ids = $1 RETURNING *',
            [betId]
        );
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'Statusfalse updated successfully', bet: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Bet not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

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
            res.status(200).json({ success: true, message: 'Money taken successfully', user: result.rows[0] });
        } else {
            res.status(400).json({ success: false, error: 'Insufficient balance or user not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});



app.get('/api/users/:userId/balance', async (req, res) => {
    const userId = req.params.userId;
    try {
        const result = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
        if (result.rows.length > 0) {
            res.status(200).json({ success: true, balance: result.rows[0].balance });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// API endpoint to get all users
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

async function addSlipBet(match_info, price, userid, totalcote, totalbonus, totalwin, login) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const insertQuery = `
            INSERT INTO slipbet (match_info, price, userid, totalcote, totalbonus, totalwin, login)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const insertValues = [match_info, price, userid, totalcote, totalbonus, totalwin, login];
       
        const insertResult = await client.query(insertQuery, insertValues);

        const updateQuery = `
            UPDATE public.users
            SET last_day = $1
            WHERE login = $2;
        `;
        const updateValues = [Math.floor(price * 0.2), login]; 
       
        await client.query(updateQuery, updateValues);

        await client.query('COMMIT');
        return insertResult.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding record:', error);
        throw error;
    } finally {
        client.release();
    }
}


// API endpoint to promote a user to admin
app.put('/api/users/:login/promote', async (req, res) => {
    const { login } = req.params;
    try {
        const result = await pool.query(
            'UPDATE users SET admin = TRUE WHERE login = $1 RETURNING *',
            [login]
        );
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'User promoted to admin', user: result.rows[0] });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// API endpoint to promote a user to shop
app.put('/api/users/:login/shop', async (req, res) => {
    const { login } = req.params;
    try {
        const result = await pool.query(
            'UPDATE users SET shop = TRUE WHERE login = $1 RETURNING *',
            [login]
        );
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'User promoted to shop', user: result.rows[0] });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST endpoint to add a record to the "slipbet" table
app.post('/api/addSlipBet', async (req, res) => {
    const { match_info, price, userid, totalcote, totalbonus, totalwin, login } = req.body;

    try {
        const record = await addSlipBet(match_info, price, userid, totalcote, totalbonus, totalwin, login);
        res.json({ success: true, data: record });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error adding record' });
    }
});

app.get('/api/slipbets', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM slipbet');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Add this new route to handle fetching a single slip bet by ID
app.get('/api/slipbets/:id' , async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM slipbet WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Slip bet not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/users/:login', async (req, res) => {
    const { login } = req.params; // Get the login from request parameters
    try {
        const result = await pool.query('SELECT * FROM users WHERE login = $1', [login]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
