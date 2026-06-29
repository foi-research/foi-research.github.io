/* ============================================
   FOI Research Group — JavaScript
   Prof. Giovanni Esposito, ULB Brussels
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // --- Navbar scroll effect ---
    const navbar = document.querySelector('.navbar');
    const handleScroll = () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // --- Mobile nav toggle ---
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('open');
            document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
        });

        // Close mobile nav on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // --- Active nav link on scroll ---
    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-links a[href^="#"]');

    const updateActiveNav = () => {
        const scrollPos = window.scrollY + 120;
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            if (scrollPos >= top && scrollPos < top + height) {
                navItems.forEach(a => {
                    a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
                });
            }
        });
    };
    window.addEventListener('scroll', updateActiveNav, { passive: true });

    // --- Intersection Observer for reveal animations ---
    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Expose observer globally so cms-render.js can use it
        window.__cmsRevealObserver = revealObserver;

        // Observe existing elements
        document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

        // MutationObserver: auto-observe dynamically added .reveal elements
        const mutationObs = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.classList && node.classList.contains('reveal')) {
                        revealObserver.observe(node);
                    }
                    // Also check children of added nodes
                    if (node.querySelectorAll) {
                        node.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
                    }
                });
            });
        });
        mutationObs.observe(document.body, { childList: true, subtree: true });
    } else {
        // Fallback: show everything
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    }

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({ top: offsetTop, behavior: 'smooth' });
            }
        });
    });

    // --- Counter animation for hero stats ---
    const animateCounters = () => {
        document.querySelectorAll('.hero-stat-number[data-count]').forEach(counter => {
            if (counter.dataset.animated) return;
            counter.dataset.animated = 'true';
            const target = parseInt(counter.dataset.count, 10);
            const suffix = counter.dataset.suffix || '';
            const duration = 2000;
            const start = performance.now();

            const step = (now) => {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                const value = Math.floor(eased * target);
                counter.textContent = value.toLocaleString() + suffix;
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
    };

    // Trigger counter animation when hero is visible
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        const heroObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setTimeout(animateCounters, 500);
                heroObserver.disconnect();
            }
        }, { threshold: 0.3 });
        heroObserver.observe(heroSection);
    }
});

/* --- Right-side drawer: backdrop + Esc-to-close --- */
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (!toggle || !links) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    document.body.appendChild(backdrop);

    const syncBackdrop = () => backdrop.classList.toggle('open', links.classList.contains('open'));
    const close = () => {
        toggle.classList.remove('active');
        links.classList.remove('open');
        backdrop.classList.remove('open');
        document.body.style.overflow = '';
    };

    // run after the existing toggle handler has flipped the classes
    toggle.addEventListener('click', () => setTimeout(syncBackdrop, 0));
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
});

/* --- Image lightbox (click any [data-img] to view a photo popup) --- */
document.addEventListener('DOMContentLoaded', () => {
    let box;
    const open = (src) => {
        if (!box) {
            box = document.createElement('div');
            box.className = 'img-lightbox';
            box.innerHTML = '<span class="img-lightbox-close" aria-label="Close">&times;</span><img alt=""/>';
            document.body.appendChild(box);
            box.addEventListener('click', (e) => {
                if (e.target === box || e.target.classList.contains('img-lightbox-close')) box.classList.remove('open');
            });
        }
        box.querySelector('img').src = src;
        box.classList.add('open');
    };
    document.addEventListener('click', (e) => {
        const a = e.target.closest('[data-img]');
        if (a) { e.preventDefault(); open(a.getAttribute('data-img')); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && box) box.classList.remove('open'); });
});

/* --- PDF / slides lightbox (click a [data-pdf] to open a scrollable preview) --- */
document.addEventListener('DOMContentLoaded', () => {
    let box;
    const open = (src) => {
        if (!box) {
            box = document.createElement('div');
            box.className = 'pdf-lightbox';
            box.innerHTML = '<span class="pdf-close" aria-label="Close">&times;</span><iframe title="PDF preview"></iframe>';
            document.body.appendChild(box);
            box.addEventListener('click', (e) => {
                if (e.target === box || e.target.classList.contains('pdf-close')) {
                    box.classList.remove('open');
                    box.querySelector('iframe').src = 'about:blank';
                    document.body.style.overflow = '';
                }
            });
        }
        box.querySelector('iframe').src = src;
        box.classList.add('open');
        document.body.style.overflow = 'hidden';
    };
    document.addEventListener('click', (e) => {
        const a = e.target.closest('[data-pdf]');
        if (a) { e.preventDefault(); open(a.getAttribute('data-pdf')); }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && box && box.classList.contains('open')) {
            box.classList.remove('open'); box.querySelector('iframe').src = 'about:blank'; document.body.style.overflow = '';
        }
    });
});
