const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public2")));

const pool = mysql.createPool({
  host: "info465dbnew.cpgdcb7fdlhl.us-east-1.rds.amazonaws.com",
  user: "admin",
  password: "iloveinfo465",
  database: "summer_course_registration",
  waitForConnections: true,
  connectionLimit: 10
});

app.get("/api/test", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT 'Connected to database' AS message");
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.get("/api/classes", async (req, res) => {
  try {
    const { department, instructor, courseNum } = req.query;

    let sql = `
      SELECT
        s.section_id,
        s.section_num,
        s.term,
        s.year,
        s.modality,
        s.max_students,
        c.course_num,
        c.course_name,
        c.credit_hours,
        i.first_name AS instructor_first,
        i.last_name AS instructor_last,
        d.department_name
      FROM Section s
      JOIN Course c ON s.course_id = c.course_id
      JOIN Instructor i ON s.instructor_id = i.instructor_id
      JOIN Department d ON c.department_id = d.department_id
      WHERE s.term = 'Summer'
    `;

    const params = [];

    if (department) {
      sql += ` AND d.department_name LIKE ?`;
      params.push(`%${department}%`);
    }

    if (instructor) {
      sql += ` AND CONCAT(i.first_name, ' ', i.last_name) LIKE ?`;
      params.push(`%${instructor}%`);
    }

    if (courseNum) {
      sql += ` AND c.course_num LIKE ?`;
      params.push(`%${courseNum}%`);
    }

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch classes" });
  }
});

app.get("/api/students/:studentId/classes", async (req, res) => {
  try {
    const { studentId } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT
        c.course_num,
        c.course_name,
        s.section_id,
        s.section_num,
        s.term,
        s.year,
        s.modality
      FROM Registration r
      JOIN Section s ON r.section_id = s.section_id
      JOIN Course c ON s.course_id = c.course_id
      WHERE r.student_id = ?
      `,
      [studentId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch student classes" });
  }
});

app.get("/api/instructors/:instructorId/sessions", async (req, res) => {
  try {
    const { instructorId } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT
        s.section_id,
        s.section_num,
        s.term,
        s.year,
        s.modality,
        c.course_num,
        c.course_name
      FROM Section s
      JOIN Course c ON s.course_id = c.course_id
      WHERE s.instructor_id = ?
      `,
      [instructorId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch instructor sessions" });
  }
});

app.post("/api/enroll", async (req, res) => {
  try {
    const { student_id, section_id } = req.body;

    await pool.execute(
      `INSERT INTO Registration (student_id, section_id) VALUES (?, ?)`,
      [student_id, section_id]
    );

    res.json({ message: "Student enrolled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Enrollment failed" });
  }
});

app.get("/api/sessions/:sectionId/students", async (req, res) => {
  try {
    const { sectionId } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT
        st.student_id,
        st.first_name,
        st.last_name
      FROM Registration r
      JOIN Student st ON r.student_id = st.student_id
      WHERE r.section_id = ?
      `,
      [sectionId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch enrolled students" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { studentId, password } = req.body;

    const [rows] = await pool.execute(
      `SELECT * FROM Student WHERE student_id = ?`,
      [studentId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid login" });
    }

    const student = rows[0];

    if (password !== "123") {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.json({
      message: "Login successful",
      student_id: student.student_id,
      first_name: student.first_name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

