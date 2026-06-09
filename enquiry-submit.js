/**
 * EDU-CARE — Real Enquiry Submission to Firebase Firestore
 * 
 * This module intercepts form submissions from both the contact form
 * and modal enquiry form, and writes them to the Firestore `enquiries` collection.
 * It works alongside main.js which handles UI interactions (validation, modal open/close).
 */

// Signal to main.js that Firebase is handling form submissions
window.__firebaseEnabled = true;

import { db, collection, addDoc, serverTimestamp } from './firebase-config.js';

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
  setupFirestoreSubmission();
});

function setupFirestoreSubmission() {
  const contactForm = document.getElementById('contact-enquiry-form');
  const modalForm = document.getElementById('modal-enquiry-form');

  // Override the contact form submission
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Check HTML5 validity first (main.js handles visual validation)
      const inputs = contactForm.querySelectorAll('input[required], select[required]');
      let isValid = true;
      inputs.forEach(input => {
        if (!input.checkValidity()) isValid = false;
      });

      if (!isValid) return; // Let main.js handle the error display

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      await submitEnquiry(contactForm, submitBtn, {
        name: document.getElementById('contact-name').value.trim(),
        phone: document.getElementById('contact-phone').value.trim(),
        email: document.getElementById('contact-email').value.trim(),
        course: document.getElementById('contact-course').value,
        message: document.getElementById('contact-message').value.trim(),
        source: 'contact_form'
      }, 'contact-form-success');
    });
  }

  // Override the modal form submission
  if (modalForm) {
    modalForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const inputs = modalForm.querySelectorAll('input[required], select[required]');
      let isValid = true;
      inputs.forEach(input => {
        if (!input.checkValidity()) isValid = false;
      });

      if (!isValid) return;

      const submitBtn = modalForm.querySelector('button[type="submit"]');
      await submitEnquiry(modalForm, submitBtn, {
        name: document.getElementById('modal-name').value.trim(),
        phone: document.getElementById('modal-phone').value.trim(),
        email: document.getElementById('modal-email').value.trim(),
        course: document.getElementById('modal-course').value,
        message: document.getElementById('modal-message').value.trim(),
        source: 'modal'
      }, 'modal-success-screen', 'modal-form-body');
    });
  }
}

// Google Sheets Webhook URL (Replace with your actual deployed Apps Script Web App URL)
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx7TtNFSBbz9_jxyDJ6Z6L9qNDl5qnJp8Wa1F1NbrtidtQHD1Mx0Kza4DUaP_CvKAaC/exec';

/**
 * Submit enquiry data to Firestore and Google Sheets Webhook
 */
async function submitEnquiry(formElement, submitBtn, data, successElementId, hideElementId = null) {
  const originalText = submitBtn.textContent;

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending Enquiry...';
  submitBtn.style.opacity = '0.7';

  try {
    // Write to Firestore
    await addDoc(collection(db, 'enquiries'), {
      ...data,
      status: 'new',
      notes: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Send to Google Sheets (Non-blocking: don't let Sheets failure ruin Firestore success)
    if (GOOGLE_SHEETS_WEBHOOK_URL) {
      fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script requires redirect handling which mode: 'no-cors' easily bypasses for simple posts
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          status: 'new',
          createdAt: new Date().toISOString()
        })
      }).catch(err => {
        console.warn('Google Sheets Webhook error (handled):', err);
      });
    } else {
      console.log('Google Sheets Webhook URL not configured. Skipping Sheets sync.');
    }

    // Show success UI
    if (hideElementId) {
      document.getElementById(hideElementId).setAttribute('hidden', '');
    } else {
      formElement.setAttribute('hidden', '');
    }
    document.getElementById(successElementId).removeAttribute('hidden');

  } catch (error) {
    console.error('Firestore write error:', error);

    // Show a user-friendly error message
    showToast('⚠️ Could not send enquiry. Please try again or call us directly.', 'error');
  } finally {
    // Reset button
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    submitBtn.style.opacity = '';
  }
}

/**
 * Simple toast notification for errors
 */
function showToast(message, type = 'info') {
  // Remove existing toast if any
  const existing = document.querySelector('.firebase-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `firebase-toast firebase-toast--${type}`;
  toast.textContent = message;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '14px 28px',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    zIndex: '10000',
    animation: 'toastIn 0.3s ease-out',
    maxWidth: '90vw',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    background: type === 'error'
      ? 'linear-gradient(135deg, #ff4444, #cc0000)'
      : 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff'
  });

  document.body.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Add toast animation keyframes
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes toastOut {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(20px); }
  }
`;
document.head.appendChild(toastStyle);
