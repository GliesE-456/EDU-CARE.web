/**
 * EDU-CARE Admin Dashboard — admin.js
 * 
 * Handles:
 * - Firebase Auth (login/register/logout)
 * - Real-time Firestore listeners for enquiries, students, courses
 * - CRUD operations for all collections
 * - Dashboard analytics
 * - Tab navigation, search, filtering
 */

import {
  db, auth,
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, serverTimestamp, Timestamp,
  signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword
} from './firebase-config.js';

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
let currentUser = null;
let allEnquiries = [];
let allStudents = [];
let allCourses = [];
let currentEnquiryId = null;
let pendingDeleteAction = null;

// Unsubscribe functions for real-time listeners
let unsubEnquiries = null;
let unsubStudents = null;
let unsubCourses = null;

// ═══════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initTabNavigation();
  initSidebar();
  initModals();
  initFilters();
  initStudentForm();
  initCourseForm();
});

// ═══════════════════════════════════════════════════════
// 1. AUTHENTICATION
// ═══════════════════════════════════════════════════════
function initAuth() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const toggleRegister = document.getElementById('toggle-register');
  const logoutBtn = document.getElementById('logout-btn');

  // Toggle register form
  toggleRegister.addEventListener('click', () => {
    const isHidden = registerForm.hidden;
    registerForm.hidden = !isHidden;
    toggleRegister.textContent = isHidden
      ? 'Back to Sign In'
      : 'Create Admin Account (First Time)';
  });

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorEl.hidden = true;

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      errorEl.textContent = getAuthErrorMessage(err.code);
      errorEl.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // Register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');
    const btn = document.getElementById('register-btn');

    btn.disabled = true;
    btn.textContent = 'Creating account...';
    errorEl.hidden = true;

    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      errorEl.textContent = getAuthErrorMessage(err.code);
      errorEl.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Create Account & Sign In';
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
  });

  // Auth state observer
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      showDashboard();
      startRealtimeListeners();
    } else {
      currentUser = null;
      showLogin();
      stopRealtimeListeners();
    }
  });
}

function showDashboard() {
  document.getElementById('login-screen').hidden = true;
  document.getElementById('admin-dashboard').hidden = false;
  document.getElementById('sidebar-user-email').textContent = currentUser.email;
}

function showLogin() {
  document.getElementById('login-screen').hidden = false;
  document.getElementById('admin-dashboard').hidden = true;
}

function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'Invalid email address format.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  };
  return messages[code] || `Authentication error: ${code}`;
}

// ═══════════════════════════════════════════════════════
// 2. REAL-TIME LISTENERS
// ═══════════════════════════════════════════════════════
function startRealtimeListeners() {
  // Enquiries — real-time, ordered by newest first
  const enquiriesQuery = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));
  unsubEnquiries = onSnapshot(enquiriesQuery, (snapshot) => {
    allEnquiries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderEnquiriesTable();
    renderRecentEnquiries();
    updateDashboardStats();
  }, (error) => {
    console.error('Enquiries listener error:', error);
    showToast('Failed to load enquiries. Check your Firebase config.', 'error');
  });

  // Students
  const studentsQuery = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
  unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
    allStudents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStudentsTable();
    updateDashboardStats();
  }, (error) => {
    console.error('Students listener error:', error);
  });

  // Courses
  const coursesQuery = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
  unsubCourses = onSnapshot(coursesQuery, (snapshot) => {
    allCourses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCoursesGrid();
    updateDashboardStats();
  }, (error) => {
    console.error('Courses listener error:', error);
  });
}

function stopRealtimeListeners() {
  if (unsubEnquiries) unsubEnquiries();
  if (unsubStudents) unsubStudents();
  if (unsubCourses) unsubCourses();
}

// ═══════════════════════════════════════════════════════
// 3. DASHBOARD STATS
// ═══════════════════════════════════════════════════════
function updateDashboardStats() {
  document.getElementById('stat-total-enquiries').textContent = allEnquiries.length;
  document.getElementById('stat-new-enquiries').textContent = allEnquiries.filter(e => e.status === 'new').length;
  document.getElementById('stat-total-students').textContent = allStudents.filter(s => s.status === 'active').length;
  document.getElementById('stat-active-courses').textContent = allCourses.filter(c => c.isActive).length;

  // Update badge
  const newCount = allEnquiries.filter(e => e.status === 'new').length;
  const badge = document.getElementById('enquiry-badge');
  badge.textContent = newCount;
  badge.style.display = newCount > 0 ? 'inline-block' : 'none';
}

// ═══════════════════════════════════════════════════════
// 4. RENDER: ENQUIRIES
// ═══════════════════════════════════════════════════════
function renderEnquiriesTable() {
  const tbody = document.getElementById('enquiries-body');
  const statusFilter = document.getElementById('enquiry-status-filter').value;
  const searchTerm = document.getElementById('enquiry-search').value.toLowerCase().trim();

  let filtered = allEnquiries;

  if (statusFilter !== 'all') {
    filtered = filtered.filter(e => e.status === statusFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(e =>
      (e.name || '').toLowerCase().includes(searchTerm) ||
      (e.phone || '').includes(searchTerm) ||
      (e.email || '').toLowerCase().includes(searchTerm)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No enquiries found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(e => `
    <tr>
      <td>${escapeHtml(e.name || 'N/A')}</td>
      <td>${escapeHtml(e.phone || 'N/A')}</td>
      <td>${escapeHtml(e.email || 'N/A')}</td>
      <td>${escapeHtml(e.course || 'N/A')}</td>
      <td><span class="source-badge">${e.source || 'web'}</span></td>
      <td><span class="status-badge status-${e.status || 'new'}">${e.status || 'new'}</span></td>
      <td>${formatDate(e.createdAt)}</td>
      <td>
        <div class="table-actions">
          <button class="table-action-btn btn-view" onclick="window.adminApp.viewEnquiry('${e.id}')">View</button>
          <button class="table-action-btn btn-delete" onclick="window.adminApp.confirmDelete('enquiry', '${e.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderRecentEnquiries() {
  const tbody = document.getElementById('recent-enquiries-body');
  const recent = allEnquiries.slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No enquiries yet. Submissions from your website will appear here.</td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(e => `
    <tr>
      <td>${escapeHtml(e.name || 'N/A')}</td>
      <td>${escapeHtml(e.phone || 'N/A')}</td>
      <td>${escapeHtml(e.course || 'N/A')}</td>
      <td><span class="status-badge status-${e.status || 'new'}">${e.status || 'new'}</span></td>
      <td>${formatDate(e.createdAt)}</td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════════════════
// 5. RENDER: STUDENTS
// ═══════════════════════════════════════════════════════
function renderStudentsTable() {
  const tbody = document.getElementById('students-body');
  const statusFilter = document.getElementById('student-status-filter').value;
  const searchTerm = document.getElementById('student-search').value.toLowerCase().trim();

  let filtered = allStudents;

  if (statusFilter !== 'all') {
    filtered = filtered.filter(s => s.status === statusFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(s =>
      (s.name || '').toLowerCase().includes(searchTerm) ||
      (s.phone || '').includes(searchTerm)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No students found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const feesDisplay = s.fees ? `₹${(s.feesPaid || 0).toLocaleString()} / ₹${s.fees.toLocaleString()}` : '—';
    return `
      <tr>
        <td>${escapeHtml(s.name || 'N/A')}</td>
        <td>${escapeHtml(s.phone || 'N/A')}</td>
        <td>${escapeHtml(s.class || 'N/A')}</td>
        <td>${escapeHtml(s.course || 'N/A')}</td>
        <td>${escapeHtml(s.batch || '—')}</td>
        <td><span class="status-badge status-${s.status || 'active'}">${s.status || 'active'}</span></td>
        <td>${feesDisplay}</td>
        <td>
          <div class="table-actions">
            <button class="table-action-btn btn-edit" onclick="window.adminApp.editStudent('${s.id}')">Edit</button>
            <button class="table-action-btn btn-delete" onclick="window.adminApp.confirmDelete('student', '${s.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════
// 6. RENDER: COURSES
// ═══════════════════════════════════════════════════════
function renderCoursesGrid() {
  const grid = document.getElementById('courses-admin-grid');

  if (allCourses.length === 0) {
    grid.innerHTML = `<div class="empty-state-card">No courses yet. Click "Add Course" to create one.</div>`;
    return;
  }

  grid.innerHTML = allCourses.map(c => {
    const subjects = (c.subjects || []).join(', ') || 'No subjects listed';
    return `
      <div class="course-admin-card">
        <div class="course-card-header">
          <div>
            <div class="course-card-title">${escapeHtml(c.title || 'Untitled')}</div>
            <div class="course-card-level">${escapeHtml(c.level || '')}</div>
          </div>
          <span class="active-indicator ${c.isActive ? 'is-active' : 'is-inactive'}" title="${c.isActive ? 'Active' : 'Inactive'}"></span>
        </div>
        <div class="course-card-desc">${escapeHtml(c.description || 'No description')}</div>
        <div class="course-card-meta">
          <span class="course-meta-item">📚 ${escapeHtml(subjects)}</span>
          ${c.schedule ? `<span class="course-meta-item">🕒 ${escapeHtml(c.schedule)}</span>` : ''}
          ${c.fees ? `<span class="course-meta-item">💰 ₹${c.fees.toLocaleString()}</span>` : ''}
        </div>
        <div class="course-card-actions">
          <button class="table-action-btn btn-edit" onclick="window.adminApp.editCourse('${c.id}')">Edit</button>
          <button class="table-action-btn btn-delete" onclick="window.adminApp.confirmDelete('course', '${c.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════
// 7. ENQUIRY DETAIL & STATUS UPDATE
// ═══════════════════════════════════════════════════════
function viewEnquiry(id) {
  const e = allEnquiries.find(en => en.id === id);
  if (!e) return;

  currentEnquiryId = id;

  const detailBody = document.getElementById('enquiry-detail-body');
  detailBody.innerHTML = `
    <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${escapeHtml(e.name || 'N/A')}</span></div>
    <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value"><a href="tel:${e.phone}">${escapeHtml(e.phone || 'N/A')}</a></span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value"><a href="mailto:${e.email}">${escapeHtml(e.email || 'N/A')}</a></span></div>
    <div class="detail-row"><span class="detail-label">Course</span><span class="detail-value">${escapeHtml(e.course || 'N/A')}</span></div>
    <div class="detail-row"><span class="detail-label">Source</span><span class="detail-value">${e.source || 'web'}</span></div>
    <div class="detail-row"><span class="detail-label">Message</span><span class="detail-value">${escapeHtml(e.message || 'No message')}</span></div>
    <div class="detail-row"><span class="detail-label">Submitted</span><span class="detail-value">${formatDate(e.createdAt)}</span></div>
  `;

  document.getElementById('enquiry-status-update').value = e.status || 'new';
  document.getElementById('enquiry-notes').value = e.notes || '';

  document.getElementById('enquiry-detail-modal').showModal();
}

function initEnquirySaveBtn() {
  document.getElementById('save-enquiry-btn').addEventListener('click', async () => {
    if (!currentEnquiryId) return;

    const status = document.getElementById('enquiry-status-update').value;
    const notes = document.getElementById('enquiry-notes').value.trim();

    try {
      await updateDoc(doc(db, 'enquiries', currentEnquiryId), {
        status,
        notes,
        updatedAt: serverTimestamp()
      });
      showToast('Enquiry updated successfully!', 'success');
      document.getElementById('enquiry-detail-modal').close();
    } catch (err) {
      console.error('Update error:', err);
      showToast('Failed to update enquiry.', 'error');
    }
  });

  document.getElementById('delete-enquiry-btn').addEventListener('click', () => {
    confirmDelete('enquiry', currentEnquiryId);
    document.getElementById('enquiry-detail-modal').close();
  });
}

// ═══════════════════════════════════════════════════════
// 8. STUDENT CRUD
// ═══════════════════════════════════════════════════════
function initStudentForm() {
  const addBtn = document.getElementById('add-student-btn');
  const form = document.getElementById('student-form');

  addBtn.addEventListener('click', () => {
    document.getElementById('student-modal-title').textContent = 'Add Student';
    document.getElementById('student-edit-id').value = '';
    form.reset();
    document.getElementById('student-form-modal').showModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('student-edit-id').value;
    const btn = document.getElementById('save-student-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const data = {
      name: document.getElementById('student-name').value.trim(),
      phone: document.getElementById('student-phone').value.trim(),
      email: document.getElementById('student-email').value.trim(),
      guardianName: document.getElementById('student-guardian').value.trim(),
      guardianPhone: document.getElementById('student-guardian-phone').value.trim(),
      class: document.getElementById('student-class').value.trim(),
      course: document.getElementById('student-course').value,
      batch: document.getElementById('student-batch').value.trim(),
      fees: parseFloat(document.getElementById('student-fees').value) || 0,
      feesPaid: parseFloat(document.getElementById('student-fees-paid').value) || 0,
      status: document.getElementById('student-status').value,
      notes: document.getElementById('student-notes').value.trim(),
    };

    try {
      if (editId) {
        await updateDoc(doc(db, 'students', editId), { ...data, updatedAt: serverTimestamp() });
        showToast('Student updated!', 'success');
      } else {
        await addDoc(collection(db, 'students'), {
          ...data,
          enrollmentDate: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        showToast('Student added!', 'success');
      }
      document.getElementById('student-form-modal').close();
    } catch (err) {
      console.error('Student save error:', err);
      showToast('Failed to save student.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Student';
    }
  });
}

function editStudent(id) {
  const s = allStudents.find(st => st.id === id);
  if (!s) return;

  document.getElementById('student-modal-title').textContent = 'Edit Student';
  document.getElementById('student-edit-id').value = id;
  document.getElementById('student-name').value = s.name || '';
  document.getElementById('student-phone').value = s.phone || '';
  document.getElementById('student-email').value = s.email || '';
  document.getElementById('student-guardian').value = s.guardianName || '';
  document.getElementById('student-guardian-phone').value = s.guardianPhone || '';
  document.getElementById('student-class').value = s.class || '';
  document.getElementById('student-course').value = s.course || '';
  document.getElementById('student-batch').value = s.batch || '';
  document.getElementById('student-fees').value = s.fees || '';
  document.getElementById('student-fees-paid').value = s.feesPaid || '';
  document.getElementById('student-status').value = s.status || 'active';
  document.getElementById('student-notes').value = s.notes || '';

  document.getElementById('student-form-modal').showModal();
}

// ═══════════════════════════════════════════════════════
// 9. COURSE CRUD
// ═══════════════════════════════════════════════════════
function initCourseForm() {
  const addBtn = document.getElementById('add-course-btn');
  const form = document.getElementById('course-form');

  addBtn.addEventListener('click', () => {
    document.getElementById('course-modal-title').textContent = 'Add Course';
    document.getElementById('course-edit-id').value = '';
    form.reset();
    document.getElementById('course-active').checked = true;
    document.getElementById('course-form-modal').showModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('course-edit-id').value;
    const btn = document.getElementById('save-course-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const subjectsRaw = document.getElementById('course-subjects').value.trim();
    const data = {
      title: document.getElementById('course-title').value.trim(),
      level: document.getElementById('course-level').value.trim(),
      description: document.getElementById('course-description').value.trim(),
      subjects: subjectsRaw ? subjectsRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
      schedule: document.getElementById('course-schedule').value.trim(),
      fees: parseFloat(document.getElementById('course-fees').value) || 0,
      isActive: document.getElementById('course-active').checked,
    };

    try {
      if (editId) {
        await updateDoc(doc(db, 'courses', editId), data);
        showToast('Course updated!', 'success');
      } else {
        await addDoc(collection(db, 'courses'), { ...data, createdAt: serverTimestamp() });
        showToast('Course added!', 'success');
      }
      document.getElementById('course-form-modal').close();
    } catch (err) {
      console.error('Course save error:', err);
      showToast('Failed to save course.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Course';
    }
  });
}

function editCourse(id) {
  const c = allCourses.find(co => co.id === id);
  if (!c) return;

  document.getElementById('course-modal-title').textContent = 'Edit Course';
  document.getElementById('course-edit-id').value = id;
  document.getElementById('course-title').value = c.title || '';
  document.getElementById('course-level').value = c.level || '';
  document.getElementById('course-description').value = c.description || '';
  document.getElementById('course-subjects').value = (c.subjects || []).join(', ');
  document.getElementById('course-schedule').value = c.schedule || '';
  document.getElementById('course-fees').value = c.fees || '';
  document.getElementById('course-active').checked = c.isActive !== false;

  document.getElementById('course-form-modal').showModal();
}

// ═══════════════════════════════════════════════════════
// 10. DELETE CONFIRMATION
// ═══════════════════════════════════════════════════════
function confirmDelete(type, id) {
  const labels = { enquiry: 'enquiry', student: 'student', course: 'course' };
  document.getElementById('confirm-delete-text').textContent =
    `Are you sure you want to delete this ${labels[type]}? This action cannot be undone.`;

  pendingDeleteAction = { type, id };
  document.getElementById('confirm-delete-modal').showModal();
}

function initDeleteConfirmation() {
  document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (!pendingDeleteAction) return;

    const { type, id } = pendingDeleteAction;
    const collectionName = type === 'enquiry' ? 'enquiries' : type === 'student' ? 'students' : 'courses';

    try {
      await deleteDoc(doc(db, collectionName, id));
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`, 'success');
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete. Please try again.', 'error');
    }

    pendingDeleteAction = null;
    document.getElementById('confirm-delete-modal').close();
  });
}

// ═══════════════════════════════════════════════════════
// 11. TAB NAVIGATION
// ═══════════════════════════════════════════════════════
function initTabNavigation() {
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');

  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tabId = link.dataset.tab;

      sidebarLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      tabContents.forEach(tc => tc.classList.remove('active'));
      document.getElementById(`tab-${tabId}`).classList.add('active');

      // Close mobile sidebar
      document.getElementById('sidebar').classList.remove('open');
      const overlay = document.querySelector('.sidebar-overlay');
      if (overlay) overlay.classList.remove('active');
    });
  });
}

// ═══════════════════════════════════════════════════════
// 12. SIDEBAR (MOBILE)
// ═══════════════════════════════════════════════════════
function initSidebar() {
  const toggle = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.getElementById('sidebar');

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}

// ═══════════════════════════════════════════════════════
// 13. MODALS
// ═══════════════════════════════════════════════════════
function initModals() {
  // Close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.closeModal;
      document.getElementById(modalId).close();
    });
  });

  // Light dismiss
  document.querySelectorAll('.admin-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.close();
      }
    });
  });

  initEnquirySaveBtn();
  initDeleteConfirmation();
}

// ═══════════════════════════════════════════════════════
// 14. FILTERS
// ═══════════════════════════════════════════════════════
function initFilters() {
  // Enquiry filters
  document.getElementById('enquiry-status-filter').addEventListener('change', renderEnquiriesTable);
  document.getElementById('enquiry-search').addEventListener('input', renderEnquiriesTable);

  // Student filters
  document.getElementById('student-status-filter').addEventListener('change', renderStudentsTable);
  document.getElementById('student-search').addEventListener('input', renderStudentsTable);
}

// ═══════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════
function formatDate(timestamp) {
  if (!timestamp) return '—';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.admin-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ═══════════════════════════════════════════════════════
// EXPOSE TO GLOBAL (for inline onclick handlers)
// ═══════════════════════════════════════════════════════
window.adminApp = {
  viewEnquiry,
  editStudent,
  editCourse,
  confirmDelete,
};
