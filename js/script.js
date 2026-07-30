/* ===== Spicy Kitchen — Shared JS ===== */

document.addEventListener("DOMContentLoaded", () => {
  // Mobile nav toggle
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => navLinks.classList.remove("open"));
    });
  }

  // Scroll reveal animation
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  // Menu category filtering
  const filterBtns = document.querySelectorAll(".filter-btn");
  const menuItems = document.querySelectorAll(".menu-item");

  if (filterBtns.length && menuItems.length) {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const filter = btn.dataset.filter;

        menuItems.forEach((item) => {
          const show = filter === "all" || item.dataset.category === filter;
          item.style.display = show ? "" : "none";
        });
      });
    });
  }

  // Contact form validation + feedback
  const form = document.querySelector(".contact-form");
  if (form) {
    const message = form.querySelector(".form-message");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (form.checkValidity()) {
        message.textContent =
          "Thank you! Your message has been sent. We'll get back to you soon.";
        message.classList.add("show");
        form.reset();
        setTimeout(() => message.classList.remove("show"), 5000);
      } else {
        form.reportValidity();
      }
    });
  }

  // Dynamic footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
