const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const secretKey = 'jwtsecret'; 

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'golfschema',
});

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(403).json({ message: 'Unauthorized - No token provided' });
  }

  const trimmedToken = token.replace('Bearer ', '').trim();

  jwt.verify(trimmedToken, secretKey, (err, decoded) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = decoded;
    next();
  });
};

app.get('/', (req, res) => {
  return res.json('from backend side');
});

app.post('/login', (req, res) => {
  const { login_id, password } = req.body;

  const loginSql = 'SELECT * FROM users WHERE login_id = ? AND password = ?';
  db.query(loginSql, [login_id, password], (err, result) => {
    if (err) {
      return res.json(err);
    }

    if (result.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ user_id: result[0].user_id, login_id }, secretKey, { expiresIn: '1h' });

    return res.json({ message: 'Login successful', user: result[0], token });
  });
});

app.get('/courses', verifyToken, (req, res) => {
  const sql = 'SELECT * FROM courses';
  db.query(sql, (err, data) => {
    if (err) {
      return res.json(err);
    }

    if (data.length === 0) {
      return res.json({ message: 'No data found' });
    }

    return res.json(data);
  });
});

app.post('/createCourse', verifyToken, (req, res) => {
  const { course_name, rating, slope, is_active } = req.body;
  const created_by = req.user.user_id; // Assuming user_id is stored in the token

  // Your SQL query to insert a new course
  const insertCourseSql = `
  INSERT INTO courses 
  (course_name, rating, slope, is_active, created_by, created_time, update_by, update_time) 
  VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), ?, CURRENT_TIMESTAMP())
`;

db.query(
  insertCourseSql,
  [course_name, rating, slope, is_active, created_by, created_by],
  (err, result) => {
    if (err) {
      console.error('Error inserting course:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    return res.json({ message: 'Course added successfully', courseId: result.insertId });
  }
);
});


app.listen(8081, () => {
  console.log('listening to port 8081');
});