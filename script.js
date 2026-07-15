/* ─────────────────────────────────────────────────────────
   ShopNest – Contact Page  |  script.js
───────────────────────────────────────────────────────── */

/* ── HAMBURGER MENU ──────────────────────────────────── */
const hamburger  = document.getElementById('hamburger');
const navLinks   = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

// Close menu when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

/* ── CONTACT FORM VALIDATION ──────────────────────────── */
const form        = document.getElementById('contactForm');
const submitBtn   = document.getElementById('submitBtn');
const btnText     = submitBtn.querySelector('.btn-text');
const btnLoader   = submitBtn.querySelector('.btn-loader');
const btnIcon     = submitBtn.querySelector('.btn-icon');
const successBanner = document.getElementById('successBanner');
const resetBtn    = document.getElementById('resetBtn');
const textarea    = document.getElementById('message');
const charCount   = document.getElementById('charCount');

// ── Character counter
textarea.addEventListener('input', () => {
  const len = textarea.value.length;
  charCount.textContent = len;
  if (len > 500) {
    textarea.value = textarea.value.slice(0, 500);
    charCount.textContent = 500;
  }
  charCount.style.color = len > 450 ? '#ef4444' : '';
  validate(textarea, 'messageError', () => textarea.value.trim().length >= 10, 'Message must be at least 10 characters.');
});

// ── Helpers
function showError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (el) el.textContent = msg;
}
function clearError(fieldId) {
  const el = document.getElementById(fieldId);
  if (el) el.textContent = '';
}
function setInputState(input, valid) {
  input.classList.toggle('valid',   valid);
  input.classList.toggle('invalid', !valid);
}
function validate(input, errorId, condition, message) {
  const ok = condition();
  setInputState(input, ok);
  ok ? clearError(errorId) : showError(errorId, message);
  return ok;
}

// ── Real-time validation on blur
document.getElementById('firstName').addEventListener('blur', function () {
  validate(this, 'firstNameError', () => this.value.trim().length >= 2, 'First name must be at least 2 characters.');
});
document.getElementById('lastName').addEventListener('blur', function () {
  validate(this, 'lastNameError', () => this.value.trim().length >= 2, 'Last name must be at least 2 characters.');
});
document.getElementById('email').addEventListener('blur', function () {
  validate(this, 'emailError', () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value), 'Please enter a valid email address.');
});
document.getElementById('phone').addEventListener('blur', function () {
  if (this.value.trim() === '') {
    clearError('phoneError');
    this.classList.remove('invalid', 'valid');
    return;
  }
  validate(this, 'phoneError', () => /^[\d\s\+\-\(\)]{7,20}$/.test(this.value), 'Please enter a valid phone number.');
});
document.getElementById('subject').addEventListener('change', function () {
  validate(this, 'subjectError', () => this.value !== '', 'Please select a subject.');
});
document.getElementById('message').addEventListener('blur', function () {
  validate(this, 'messageError', () => this.value.trim().length >= 10, 'Message must be at least 10 characters.');
});
document.getElementById('consent').addEventListener('change', function () {
  if (this.checked) clearError('consentError');
});

// ── Full form validation on submit
function validateAll() {
  const firstName = document.getElementById('firstName');
  const lastName  = document.getElementById('lastName');
  const email     = document.getElementById('email');
  const phone     = document.getElementById('phone');
  const subject   = document.getElementById('subject');
  const message   = document.getElementById('message');
  const consent   = document.getElementById('consent');

  let isValid = true;

  if (!validate(firstName, 'firstNameError', () => firstName.value.trim().length >= 2, 'First name must be at least 2 characters.')) isValid = false;
  if (!validate(lastName,  'lastNameError',  () => lastName.value.trim().length >= 2,  'Last name must be at least 2 characters.'))  isValid = false;
  if (!validate(email,     'emailError',     () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value), 'Please enter a valid email address.')) isValid = false;
  if (phone.value.trim() !== '') {
    if (!validate(phone, 'phoneError', () => /^[\d\s\+\-\(\)]{7,20}$/.test(phone.value), 'Please enter a valid phone number.')) isValid = false;
  }
  if (!validate(subject, 'subjectError', () => subject.value !== '', 'Please select a subject.'))          isValid = false;
  if (!validate(message, 'messageError', () => message.value.trim().length >= 10, 'Message must be at least 10 characters.')) isValid = false;
  if (!consent.checked) {
    showError('consentError', 'You must agree to the Privacy Policy to continue.');
    isValid = false;
  } else {
    clearError('consentError');
  }

  return isValid;
}

// ── Form submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateAll()) {
    // Scroll to first error
    const firstInvalid = form.querySelector('.invalid');
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Simulate async submission
  submitBtn.disabled = true;
  btnText.classList.add('hidden');
  btnIcon.classList.add('hidden');
  btnLoader.classList.remove('hidden');

  await new Promise(r => setTimeout(r, 1800));

  // Hide form, show success
  form.classList.add('hidden');
  successBanner.classList.remove('hidden');

  submitBtn.disabled = false;
  btnText.classList.remove('hidden');
  btnIcon.classList.remove('hidden');
  btnLoader.classList.add('hidden');
});

// ── Reset
resetBtn.addEventListener('click', () => {
  form.reset();
  charCount.textContent = '0';
  form.querySelectorAll('input, select, textarea').forEach(el => {
    el.classList.remove('valid', 'invalid');
  });
  form.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
  form.classList.remove('hidden');
  successBanner.classList.add('hidden');
});

/* ── FAQ ACCORDION ────────────────────────────────────── */
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
  const btn = item.querySelector('.faq-question');
  btn.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');

    // Close all first
    faqItems.forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    // Open clicked if it was closed
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

/* ── NEWSLETTER FORM ──────────────────────────────────── */
const newsletterForm = document.getElementById('newsletterForm');
const newsletterMsg  = document.getElementById('newsletterMsg');
const newsletterEmail = document.getElementById('newsletterEmail');

newsletterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = newsletterEmail.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    newsletterMsg.textContent = 'Please enter a valid email.';
    newsletterMsg.className   = 'newsletter-msg error';
    return;
  }
  newsletterMsg.textContent = '🎉 You\'re subscribed! Check your inbox.';
  newsletterMsg.className   = 'newsletter-msg success';
  newsletterEmail.value     = '';
  setTimeout(() => { newsletterMsg.textContent = ''; newsletterMsg.className = 'newsletter-msg'; }, 4000);
});

/* ── SCROLL-IN ANIMATION ──────────────────────────────── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.info-card, .form-card, .side-panel > *, .faq-item').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

/* Inject fade-in CSS dynamically */
const style = document.createElement('style');
style.textContent = `
  .fade-in { opacity: 0; transform: translateY(28px); transition: opacity .55s ease, transform .55s ease; }
  .fade-in.visible { opacity: 1; transform: translateY(0); }
`;
document.head.appendChild(style);

/* ── ACTIVE NAV HIGHLIGHT ON SCROLL ──────────────────── */
// (static page – keep 'Contact' active always)

/* ── RIPPLE EFFECT on submit button ──────────────────── */
submitBtn.addEventListener('click', function (e) {
  const ripple = document.createElement('span');
  const rect   = this.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height);
  ripple.style.cssText = `
    position:absolute; border-radius:50%; background:rgba(255,255,255,.35);
    width:${size}px; height:${size}px;
    left:${e.clientX - rect.left - size/2}px;
    top:${e.clientY - rect.top  - size/2}px;
    transform:scale(0); animation:ripple .6s linear;
    pointer-events:none;
  `;
  this.style.position = 'relative'; this.style.overflow = 'hidden';
  this.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
});

const rippleStyle = document.createElement('style');
rippleStyle.textContent = `@keyframes ripple { to { transform: scale(2.5); opacity: 0; } }`;
document.head.appendChild(rippleStyle);
