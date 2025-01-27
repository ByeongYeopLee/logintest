const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { poolConnect, pool, sql } = require('../db');

const router = express.Router();
const SALT_ROUNDS = 10;

// 회원가입
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ message: 'Email and password are required.' });
    }

    try {
        await poolConnect;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const request = pool.request();
        await request
            .input('email', sql.NVarChar, email)
            .input('password_hash', sql.NVarChar, hashedPassword)
            .query(
                'INSERT INTO users (email, password_hash) VALUES (@email, @password_hash)'
            );

        res.status(201).send({ message: 'User registered successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Error registering user.' });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ message: 'Email and password are required.' });
    }

    try {
        await poolConnect;

        const request = pool.request();
        const result = await request
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM users WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(401).send({ message: 'Invalid email or password.' });
        }

        const user = result.recordset[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).send({ message: 'Invalid email or password.' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        res.send({ message: 'Login successful.', token });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Error logging in.' });
    }
});

module.exports = router;
