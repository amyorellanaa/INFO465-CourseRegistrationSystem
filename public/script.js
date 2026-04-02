/**document.addEventListener("DOMContentLoaded", function () {

  // =============================
  // SHARED DEMO DATA
  // =============================
  const DEMO_STUDENTS = [
    { id:"S1001", password:"pass123", name:"Alex Johnson" },
    { id:"S1002", password:"pass123", name:"Jamie Lee" },
    { id:"S1003", password:"pass123", name:"Taylor Smith" }
  ];

  const DEMO_INSTRUCTORS = [
    { id:"I2001", password:"teach123", name:"Dr. Rivera" },
    { id:"I2002", password:"teach123", name:"Prof. Chen" },
    { id:"I2003", password:"teach123", name:"Prof. Patel" }
  ];

  // Persist enrollments across refresh
  const STORAGE_KEY = "nvu_enrollments_v1";

  function loadEnrollments() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : {};
    } catch {
      return {};
    }
  }

  function saveEnrollments(enrollments) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enrollments));
  }

  function ensureSeed(enrollments) {
    if (Object.keys(enrollments).length > 0) return enrollments;
    enrollments["CSCI-101-01"] = ["S1001"];
    enrollments["MATH-201-01"] = ["S1002"];
    saveEnrollments(enrollments);
    return enrollments;
  }

  function enrollmentCount(enrollments, sessionId) {
    return (enrollments[sessionId] || []).length;
  }

  function isStudentEnrolled(enrollments, sessionId, studentId) {
    return (enrollments[sessionId] || []).includes(studentId);
  }

  function getStudentName(studentId) {
    const s = DEMO_STUDENTS.find(x => x.id === studentId);
    return s ? s.name : studentId;
  }

  // =============================
  // PAGE: COURSE SEARCH
  // =============================
  function initCourseSearch() {
    const searchBtn = document.getElementById("searchBtn");
    const resultsWrap = document.getElementById("resultsWrap");
    const resultsBody = document.getElementById("resultsBody");
    const msg = document.getElementById("searchMsg");
  
    if (!searchBtn || !resultsWrap || !resultsBody || !msg) return;
  
    resultsWrap.hidden = true;
    msg.textContent = "";
  
    function renderResults(list) {
      resultsBody.innerHTML = "";
  
      if (list.length === 0) {
        resultsBody.innerHTML = "<p>No courses found.</p>";
        return;
      }
  
      list.forEach(course => {
        const card = document.createElement("div");
        card.className = "card";
        card.style.marginTop = "12px";
  
        card.innerHTML = `
          <h3>${course.course_num} — ${course.course_name}</h3>
          <p><strong>Instructor:</strong> ${course.instructor_first} ${course.instructor_last}</p>
          <p><strong>Department:</strong> ${course.department_name}</p>
          <p><strong>Credits:</strong> ${course.credit_hours}</p>
          <p><strong>Modality:</strong> ${course.modality}</p>
          <p><strong>Section ID:</strong> ${course.section_id}</p>
          <p><strong>Section Number:</strong> ${course.section_num}</p>
          <p><strong>Term:</strong> ${course.term} ${course.year}</p>
          <p><strong>Max Enrollment:</strong> ${course.max_students}</p>
        `;
  
        resultsBody.appendChild(card);
      });
    }
  
    async function doSearch() {
      try {
        const dept = (document.getElementById("dept")?.value || "").trim();
        const courseNum = (document.getElementById("courseNum")?.value || "").trim();
        const instructor = (document.getElementById("instructor")?.value || "").trim();
  
        const params = new URLSearchParams();
        if (dept) params.append("department", dept);
        if (courseNum) params.append("courseNum", courseNum);
        if (instructor) params.append("instructor", instructor);
  
        const res = await fetch(`/api/classes?${params.toString()}`);
        const data = await res.json();
  
        resultsWrap.hidden = false;
  
        if (!res.ok) {
          msg.textContent = data.error || "Search failed.";
          resultsBody.innerHTML = "<p>Could not load results.</p>";
          return;
        }
  
        msg.textContent = `Showing ${data.length} result(s).`;
        renderResults(data);
      } catch (error) {
        console.error("Course search error:", error);
        resultsWrap.hidden = false;
        msg.textContent = "Could not load courses.";
        resultsBody.innerHTML = "<p>Error loading results.</p>";
      }
    }
  
    searchBtn.addEventListener("click", doSearch);
  
    ["courseNum", "instructor"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter") doSearch();
        });
      }
    });
  }

  // =============================
  // PAGE: STUDENT REGISTRATION
  // =============================
  function initStudentRegistration() {
    const loginCard = document.getElementById("studentLoginCard");
    const dash = document.getElementById("studentDash");
    const loginBtn = document.getElementById("studentLoginBtn");
    const logoutBtn = document.getElementById("studentLogoutBtn");
    const studentIdInput = document.getElementById("studentIdInput");
    const studentPasswordInput = document.getElementById("studentPasswordInput");
    const loginMsg = document.getElementById("studentLoginMsg");
    const welcome = document.getElementById("studentWelcome");

    const enrolledList = document.getElementById("enrolledList");
    const sessionSelect = document.getElementById("sessionSelect");
    const registerBtn = document.getElementById("registerBtn");
    const registerMsg = document.getElementById("registerMsg");

    if (!loginCard || !dash || !loginBtn || !logoutBtn || !studentIdInput || !studentPasswordInput) return;

    let enrollments = ensureSeed(loadEnrollments());
    let currentStudent = null;

    dash.hidden = true;

    function renderEnrolled() {
      enrolledList.innerHTML = "";

      const enrolledSessions = DEMO_SESSIONS.filter(sess =>
        isStudentEnrolled(enrollments, sess.id, currentStudent.id)
      );

      if (enrolledSessions.length === 0) {
        enrolledList.innerHTML = "<p>No enrolled sessions.</p>";
        return;
      }

      enrolledSessions.forEach(sess => {
        const count = enrollmentCount(enrollments, sess.id);
        const div = document.createElement("div");
        div.className = "card";
        div.style.marginTop = "12px";
        div.innerHTML = `
          <h3>${sess.dept} ${sess.course} — ${sess.title}</h3>
          <p><strong>Session:</strong> ${sess.id}</p>
          <p><strong>Instructor:</strong> ${sess.instructor}</p>
          <p><strong>Modality:</strong> ${sess.modality}</p>
          <p><strong>Enrollment:</strong> ${count} / ${sess.max}</p>
        `;
        enrolledList.appendChild(div);
      });
    }

    function renderSessionSelect() {
      sessionSelect.innerHTML = "";

      DEMO_SESSIONS.forEach(sess => {
        const count = enrollmentCount(enrollments, sess.id);
        const full = count >= sess.max;

        const opt = document.createElement("option");
        opt.value = sess.id;
        opt.disabled = full;

        const status = full ? "FULL" : `${count}/${sess.max}`;
        opt.textContent = `${sess.id} — ${sess.dept} ${sess.course} (${sess.modality}) [${status}]`;

        sessionSelect.appendChild(opt);
      });
    }

    function showDashboard() {
      loginCard.hidden = true;
      dash.hidden = false;
      welcome.textContent = `Logged in as ${currentStudent.name} (${currentStudent.id})`;
      loginMsg.textContent = "";
      registerMsg.textContent = "";

      renderEnrolled();
      renderSessionSelect();
    }

    function showLogin() {
      dash.hidden = true;
      loginCard.hidden = false;
      studentIdInput.value = "";
      studentPasswordInput.value = "";
      loginMsg.textContent = "";
      registerMsg.textContent = "";
      currentStudent = null;
    }

    function handleLogin() {
      const id = studentIdInput.value.trim();
      const pass = studentPasswordInput.value.trim();

      if (!id || !pass) {
        loginMsg.textContent = "Please enter Student ID and Password.";
        return;
      }

      const student = DEMO_STUDENTS.find(s => s.id === id && s.password === pass) || null;
      if (!student) {
        loginMsg.textContent = "Invalid Student ID or Password.";
        return;
      }

      currentStudent = student;
      showDashboard();
    }

    function handleRegister() {
      registerMsg.textContent = "";

      const sessionId = sessionSelect.value;
      const sess = DEMO_SESSIONS.find(s => s.id === sessionId);
      if (!sess) {
        registerMsg.textContent = "Please select a session.";
        return;
      }

      // Duplicate prevention
      if (isStudentEnrolled(enrollments, sessionId, currentStudent.id)) {
        registerMsg.textContent = "Already enrolled in this session (duplicate blocked).";
        return;
      }

      // Max enrollment validation
      const count = enrollmentCount(enrollments, sessionId);
      if (count >= sess.max) {
        registerMsg.textContent = "This session is full (max enrollment reached).";
        renderSessionSelect();
        return;
      }

      if (!enrollments[sessionId]) enrollments[sessionId] = [];
      enrollments[sessionId].push(currentStudent.id);
      saveEnrollments(enrollments);

      registerMsg.textContent = `Registration successful for ${sessionId}.`;
      renderEnrolled();
      renderSessionSelect();
    }

    loginBtn.addEventListener("click", handleLogin);
    logoutBtn.addEventListener("click", showLogin);
    registerBtn.addEventListener("click", handleRegister);

    studentPasswordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  }

  // =============================
  // PAGE: INSTRUCTOR SCHEDULE + SESSION ENROLLMENT
  // =============================
  function initInstructorSchedule() {
    const loginCard = document.getElementById("instrLoginCard");
    const dash = document.getElementById("instrDash");
    const loginBtn = document.getElementById("instrLoginBtn");
    const logoutBtn = document.getElementById("instrLogoutBtn");
    const idInput = document.getElementById("instrIdInput");
    const passInput = document.getElementById("instrPasswordInput");
    const loginMsg = document.getElementById("instrLoginMsg");
    const welcome = document.getElementById("instrWelcome");

    const sessionsDiv = document.getElementById("instrSessions");
    const enrollmentDiv = document.getElementById("sessionEnrollment");
    const hint = document.getElementById("sessionHint");

    if (!loginCard || !dash || !loginBtn || !logoutBtn || !idInput || !passInput) return;

    let enrollments = ensureSeed(loadEnrollments());
    let currentInstructor = null;

    dash.hidden = true;

    function assignedSessionsFor(instructorName) {
      return DEMO_SESSIONS.filter(s => s.instructor === instructorName);
    }

    function renderAssignedSessions() {
      sessionsDiv.innerHTML = "";
      enrollmentDiv.innerHTML = "";
      hint.textContent = "Select a session above to view enrolled students.";

      const list = assignedSessionsFor(currentInstructor.name);

      if (list.length === 0) {
        sessionsDiv.innerHTML = "<p>No assigned sessions found.</p>";
        return;
      }

      list.forEach(sess => {
        const count = enrollmentCount(enrollments, sess.id);

        const card = document.createElement("div");
        card.className = "card";
        card.style.marginTop = "12px";
        card.style.cursor = "pointer";

        card.innerHTML = `
          <h3>${sess.id} — ${sess.title}</h3>
          <p><strong>Course:</strong> ${sess.dept} ${sess.course}</p>
          <p><strong>Modality:</strong> ${sess.modality}</p>
          <p><strong>Enrollment:</strong> ${count} / ${sess.max}</p>
          <p style="opacity:.85;"><em>Click to view enrolled students</em></p>
        `;

        card.addEventListener("click", () => renderEnrollment(sess.id, sess.title));
        sessionsDiv.appendChild(card);
      });
    }

    function renderEnrollment(sessionId, title) {
      enrollmentDiv.innerHTML = "";
      hint.textContent = `Viewing enrollment for ${sessionId} — ${title}`;

      const studentIds = enrollments[sessionId] || [];

      const box = document.createElement("div");
      box.className = "card";
      box.style.marginTop = "12px";

      if (studentIds.length === 0) {
        box.innerHTML = `<p>No students enrolled in ${sessionId}.</p>`;
        enrollmentDiv.appendChild(box);
        return;
      }

      const items = studentIds
        .map(sid => `<li>${sid} — ${getStudentName(sid)}</li>`)
        .join("");

      box.innerHTML = `
        <h3>Enrolled Students (${studentIds.length})</h3>
        <ul>${items}</ul>
      `;
      enrollmentDiv.appendChild(box);
    }

    function showDashboard() {
      loginCard.hidden = true;
      dash.hidden = false;
      welcome.textContent = `Logged in as ${currentInstructor.name} (${currentInstructor.id})`;
      loginMsg.textContent = "";
      renderAssignedSessions();
    }

    function showLogin() {
      dash.hidden = true;
      loginCard.hidden = false;
      idInput.value = "";
      passInput.value = "";
      loginMsg.textContent = "";
      currentInstructor = null;
    }

    function handleLogin() {
      const id = idInput.value.trim();
      const pass = passInput.value.trim();

      if (!id || !pass) {
        loginMsg.textContent = "Please enter Instructor ID and Password.";
        return;
      }

      const instr = DEMO_INSTRUCTORS.find(i => i.id === id && i.password === pass) || null;
      if (!instr) {
        loginMsg.textContent = "Invalid Instructor ID or Password.";
        return;
      }

      currentInstructor = instr;
      showDashboard();
    }

    loginBtn.addEventListener("click", handleLogin);
    logoutBtn.addEventListener("click", showLogin);

    passInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  }

  // Run all (each one only activates if on that page)
  initCourseSearch();
  initStudentRegistration();
  initInstructorSchedule();
}); **/

document.addEventListener("DOMContentLoaded", function () {
  initCourseSearch();

  function initCourseSearch() {
    const searchBtn = document.getElementById("searchBtn");
    const resultsWrap = document.getElementById("resultsWrap");
    const resultsBody = document.getElementById("resultsBody");
    const msg = document.getElementById("searchMsg");

    if (!searchBtn || !resultsWrap || !resultsBody || !msg) return;

    resultsWrap.hidden = true;
    msg.textContent = "";

    function renderResults(list) {
      resultsBody.innerHTML = "";

      if (list.length === 0) {
        resultsBody.innerHTML = "<p>No courses found.</p>";
        return;
      }

      list.forEach(course => {
        const card = document.createElement("div");
        card.className = "card";
        card.style.marginTop = "12px";

        card.innerHTML = `
          <h3>${course.course_num} — ${course.course_name}</h3>
          <p><strong>Instructor:</strong> ${course.instructor_first} ${course.instructor_last}</p>
          <p><strong>Department:</strong> ${course.department_name}</p>
          <p><strong>Credits:</strong> ${course.credit_hours}</p>
          <p><strong>Modality:</strong> ${course.modality}</p>
          <p><strong>Section ID:</strong> ${course.section_id}</p>
          <p><strong>Section Number:</strong> ${course.section_num}</p>
          <p><strong>Term:</strong> ${course.term} ${course.year}</p>
          <p><strong>Max Enrollment:</strong> ${course.max_students}</p>
        `;

        resultsBody.appendChild(card);
      });
    }

    async function doSearch() {
      try {
        const dept = (document.getElementById("dept")?.value || "").trim();
        const courseNum = (document.getElementById("courseNum")?.value || "").trim();
        const instructor = (document.getElementById("instructor")?.value || "").trim();

        const params = new URLSearchParams();
        if (dept) params.append("department", dept);
        if (courseNum) params.append("courseNum", courseNum);
        if (instructor) params.append("instructor", instructor);

        const res = await fetch(`/api/classes?${params.toString()}`);
        const data = await res.json();

        resultsWrap.hidden = false;

        if (!res.ok) {
          msg.textContent = data.error || "Search failed.";
          resultsBody.innerHTML = "<p>Could not load results.</p>";
          return;
        }

        msg.textContent = `Showing ${data.length} result(s).`;
        renderResults(data);
      } catch (error) {
        console.error("Course search error:", error);
        resultsWrap.hidden = false;
        msg.textContent = "Could not load courses.";
        resultsBody.innerHTML = "<p>Error loading results.</p>";
      }
    }

    searchBtn.addEventListener("click", doSearch);

    ["courseNum", "instructor"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter") doSearch();
        });
      }
    });
  }
});