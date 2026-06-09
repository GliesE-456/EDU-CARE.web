/**
 * EDU-CARE Website Interactions - main.js
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initTestimonialsSlider();
  initEnquiryModal();
  initFormValidation();
  initScrollspy();
  initScrollReveal();
});

/* ==========================================================================
   1. NAVIGATION & STICKY HEADER
   ========================================================================== */
function initNavigation() {
  const header = document.getElementById('navbar');
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');
  const links = document.querySelectorAll('.nav-link');
  
  let lastScrollTop = 0;
  const scrollThreshold = 100;

  // Hide/Show header on scroll
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > scrollThreshold) {
      header.classList.add('scroll-up');
      
      if (scrollTop > lastScrollTop) {
        // Scrolling Down
        header.classList.add('scroll-down');
      } else {
        // Scrolling Up
        header.classList.remove('scroll-down');
      }
    } else {
      header.classList.remove('scroll-up', 'scroll-down');
    }
    lastScrollTop = scrollTop;
  });

  // Mobile navigation menu toggle
  mobileToggle.addEventListener('click', () => {
    const isOpened = mobileToggle.classList.toggle('open');
    navLinks.classList.toggle('mobile-open');
    mobileToggle.setAttribute('aria-expanded', isOpened ? 'true' : 'false');
  });

  // Close mobile navigation menu on link click
  links.forEach(link => {
    link.addEventListener('click', () => {
      if (navLinks.classList.contains('mobile-open')) {
        mobileToggle.classList.remove('open');
        navLinks.classList.remove('mobile-open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

/* ==========================================================================
   2. SCROLLSPY (Highlight active section link)
   ========================================================================== */
function initScrollspy() {
  const sections = document.querySelectorAll('section, header');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let currentSectionId = '';
    const scrollPosition = window.scrollY + 120; // offset for sticky header

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    if (currentSectionId) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSectionId}`) {
          link.classList.add('active');
        }
      });
    }
  });
}
/* ==========================================================================
   3. TESTIMONIALS SLIDESHOW
   ========================================================================== */
function initTestimonialsSlider() {
  const slides = document.querySelectorAll('.testimonial-slide');
  const dots = document.querySelectorAll('.slideshow-dot');
  const prevBtn = document.getElementById('testimonial-prev');
  const nextBtn = document.getElementById('testimonial-next');
  const slideshow = document.getElementById('testimonial-slideshow');
  
  if (slides.length === 0 || !slideshow) return;
  
  let currentSlide = 0;
  let autoplayTimer = null;
  let isAnimating = false;
  const autoplayDelay = 6000;

  function showSlide(index) {
    if (isAnimating || index === currentSlide) return;
    isAnimating = true;

    const prevSlide = slides[currentSlide];
    
    // Wrap index
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;

    const nextSlideEl = slides[index];

    // Deactivate current
    prevSlide.classList.remove('active');
    prevSlide.classList.add('exit-left');
    dots[currentSlide].classList.remove('active');

    // Activate new
    nextSlideEl.classList.add('active');
    dots[index].classList.add('active');

    currentSlide = index;

    // Clean up exit class after transition
    setTimeout(() => {
      prevSlide.classList.remove('exit-left');
      isAnimating = false;
    }, 500);
  }

  function nextSlide() {
    showSlide(currentSlide + 1);
  }

  function prevSlide() {
    showSlide(currentSlide - 1);
  }

  // Event Listeners
  nextBtn.addEventListener('click', () => {
    nextSlide();
    resetAutoplay();
  });

  prevBtn.addEventListener('click', () => {
    prevSlide();
    resetAutoplay();
  });

  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      showSlide(index);
      resetAutoplay();
    });
  });

  // Autoplay
  function startAutoplay() {
    autoplayTimer = setInterval(nextSlide, autoplayDelay);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function resetAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  // Pause on hover
  slideshow.addEventListener('mouseenter', stopAutoplay);
  slideshow.addEventListener('mouseleave', startAutoplay);

  // Touch/swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  slideshow.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  slideshow.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide(); else prevSlide();
      resetAutoplay();
    }
  }, { passive: true });

  // Start autoplay
  startAutoplay();
}

/* ==========================================================================
   4. GLOBAL ENQUIRY DIALOG (MODAL)
   ========================================================================== */
function initEnquiryModal() {
  const dialog = document.getElementById('enquiry-modal');
  const openButtons = document.querySelectorAll('.open-enquiry-modal');
  const closeBtn = document.getElementById('close-modal-btn');
  const okBtn = document.getElementById('modal-success-ok-btn');
  const modalFormBody = document.getElementById('modal-form-body');
  const successScreen = document.getElementById('modal-success-screen');
  const modalForm = document.getElementById('modal-enquiry-form');
  const courseDropdown = document.getElementById('modal-course');

  if (!dialog) return;

  // Open modal on click
  openButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Check if button passes a default course selection
      const defaultCourse = btn.getAttribute('data-course');
      if (defaultCourse && courseDropdown) {
        courseDropdown.value = defaultCourse;
      } else if (courseDropdown) {
        courseDropdown.selectedIndex = 0; // Reset to default placeholder
      }

      // Reset success/form states
      modalFormBody.removeAttribute('hidden');
      successScreen.setAttribute('hidden', '');
      modalForm.reset();
      clearFormFallbacks(modalForm);

      dialog.showModal();
    });
  });

  // Close functions
  const closeModal = () => {
    dialog.close();
  };

  closeBtn.addEventListener('click', closeModal);
  okBtn.addEventListener('click', closeModal);

  // Light dismiss fallback (clicking outside content area)
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isDialogContent = (
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width
    );

    if (!isDialogContent) {
      closeModal();
    }
  });
}

/* ==========================================================================
   5. FORM VALIDATIONS & MOCK SUBMIT
   ========================================================================== */
function initFormValidation() {
  const contactForm = document.getElementById('contact-enquiry-form');
  const modalForm = document.getElementById('modal-enquiry-form');

  // Sync aria-invalid with CSS :user-invalid state
  const syncAria = (el) => {
    const isInvalid = el.matches(':user-invalid') || el.classList.contains('invalid-fallback');
    el.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
  };

  // Setup input, select, and blur listeners on any form input
  document.querySelectorAll('input[required], select[required]').forEach(el => {
    el.addEventListener('blur', () => {
      // Check validation and set visual fallback classes for older browsers
      validateElement(el);
      syncAria(el);
    }, true);

    el.addEventListener('input', () => {
      if (el.checkValidity()) {
        el.classList.remove('invalid-fallback');
        el.removeAttribute('aria-invalid');
      }
    });

    el.addEventListener('change', () => {
      if (el.checkValidity()) {
        el.classList.remove('invalid-fallback');
        el.removeAttribute('aria-invalid');
      }
    });
  });

  // Validate individual form control
  function validateElement(el) {
    const isValid = el.checkValidity();
    el.classList.toggle('invalid-fallback', !isValid);
    return isValid;
  }

  // Handle page inline contact form submission
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const inputs = contactForm.querySelectorAll('input[required], select[required]');
      let formIsValid = true;
      let firstInvalidElement = null;

      inputs.forEach(input => {
        const isVal = validateElement(input);
        syncAria(input);
        if (!isVal) {
          formIsValid = false;
          if (!firstInvalidElement) firstInvalidElement = input;
        }
      });

      if (formIsValid) {
        submitMockForm(contactForm, 'contact-form-success');
      } else if (firstInvalidElement) {
        firstInvalidElement.focus();
      }
    });

    // Handle Reset Button on success
    const resetBtn = document.getElementById('contact-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        contactForm.removeAttribute('hidden');
        document.getElementById('contact-form-success').setAttribute('hidden', '');
        contactForm.reset();
        clearFormFallbacks(contactForm);
      });
    }
  }

  // Handle modal enquiry form submission
  if (modalForm) {
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const inputs = modalForm.querySelectorAll('input[required], select[required]');
      let formIsValid = true;
      let firstInvalidElement = null;

      inputs.forEach(input => {
        const isVal = validateElement(input);
        syncAria(input);
        if (!isVal) {
          formIsValid = false;
          if (!firstInvalidElement) firstInvalidElement = input;
        }
      });

      if (formIsValid) {
        submitMockForm(modalForm, 'modal-success-screen', 'modal-form-body');
      } else if (firstInvalidElement) {
        firstInvalidElement.focus();
      }
    });
  }
}

// Perform form submit — either real Firebase write or mock fallback
function submitMockForm(formElement, successElementId, hideElementId = null) {
  // If Firebase module is loaded, it handles submission directly.
  // This mock is only a fallback when Firebase isn't configured.
  if (window.__firebaseEnabled) return;

  const submitBtn = formElement.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  // Disable button and add visually appealing loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending Enquiry...';
  submitBtn.style.opacity = '0.7';

  // Simulate server latency
  setTimeout(() => {
    // Show success view
    if (hideElementId) {
      document.getElementById(hideElementId).setAttribute('hidden', '');
    } else {
      formElement.setAttribute('hidden', '');
    }
    
    document.getElementById(successElementId).removeAttribute('hidden');
    
    // Reset submit button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    submitBtn.style.opacity = '';
  }, 1000);
}

// Clear all validation visual feedback classes from form
function clearFormFallbacks(formElement) {
  formElement.querySelectorAll('.invalid-fallback').forEach(el => {
    el.classList.remove('invalid-fallback');
    el.removeAttribute('aria-invalid');
  });
}

/* ==========================================================================
   8. SCROLL REVEAL (FADE-IN ANIMATIONS)
   ========================================================================== */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.scroll-reveal');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Reveal only once
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px' // Triggers slightly before element is fully in view
  });
  
  revealElements.forEach(el => {
    observer.observe(el);
  });
}
