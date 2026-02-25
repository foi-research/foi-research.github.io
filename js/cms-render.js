/* ============================================
   FOI Research Group — CMS Rendering Engine
   Loads JSON data and renders page content
   ============================================ */

const CMS = {
    dataCache: {},

    async fetchJSON(file) {
        if (this.dataCache[file]) return this.dataCache[file];
        try {
            const resp = await fetch('data/' + file);
            if (!resp.ok) throw new Error('Failed to load ' + file);
            const data = await resp.json();
            this.dataCache[file] = data;
            return data;
        } catch (e) {
            console.error('CMS: Error loading', file, e);
            return null;
        }
    },

    // After rendering, trigger reveal animations on new elements
    observeReveals() {
        if (typeof window.__cmsRevealObserver === 'undefined') return;
        document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
            window.__cmsRevealObserver.observe(el);
        });
    },

    // =========================================
    // HOME PAGE
    // =========================================
    async renderHome() {
        const [home, pubs] = await Promise.all([
            this.fetchJSON('home.json'),
            this.fetchJSON('publications.json')
        ]);
        if (!home) return;

        // Hero
        const heroEl = document.getElementById('cms-hero');
        if (heroEl && home.hero) {
            const h = home.hero;
            heroEl.innerHTML = `
                <div class="hero-badge">
                    <div class="hero-badge-dot"></div>
                    <span>${h.badge}</span>
                </div>
                <h1>${h.title}</h1>
                <p class="hero-description">${h.description}</p>
                <div class="hero-actions">
                    <a href="${h.primaryBtn.link}" class="btn btn-primary">${h.primaryBtn.text}</a>
                    <a href="${h.secondaryBtn.link}" class="btn btn-outline">${h.secondaryBtn.text}</a>
                </div>
            `;
        }

        // Research cards
        const cardsEl = document.getElementById('cms-research-cards');
        if (cardsEl && home.researchCards) {
            cardsEl.innerHTML = home.researchCards.map((card, i) => `
                <a href="${card.link}" class="home-card reveal reveal-delay-${i + 1}">
                    <div class="home-card-icon">${card.icon}</div>
                    <h3>${card.title}</h3>
                    <p>${card.description}</p>
                    <span class="card-arrow">Learn more &rarr;</span>
                </a>
            `).join('');
        }

        // Publications preview (show items with showOnHome=true)
        const pubsEl = document.getElementById('cms-home-publications');
        if (pubsEl && pubs) {
            const homePubs = pubs.filter(p => p.showOnHome);
            pubsEl.innerHTML = homePubs.map((p, i) => `
                <div class="pub-item reveal reveal-delay-${i + 1}">
                    <div class="pub-year">${p.year}</div>
                    <div class="pub-content">
                        <h4>${p.title} <span class="pub-badge ${p.status}">${this.statusLabel(p.status)}</span></h4>
                        <div class="pub-authors">${p.authors}</div>
                        <div class="pub-venue">${p.venue}</div>
                    </div>
                </div>
            `).join('');
        }

        // Team preview
        const teamEl = document.getElementById('cms-home-team');
        if (teamEl && home.teamPreview) {
            teamEl.innerHTML = `
                <div class="reveal reveal-delay-1">
                    <p style="font-size: 1.05rem; color: var(--gray-600); max-width: 720px; line-height: 1.8; margin-bottom: 1.5rem;">
                        ${home.teamPreview}
                    </p>
                    <a href="team.html" class="btn btn-secondary btn-sm">Meet the team &rarr;</a>
                </div>
            `;
        }

        this.observeReveals();
    },

    // =========================================
    // ABOUT PAGE
    // =========================================
    async renderAbout() {
        const data = await this.fetchJSON('about.json');
        if (!data) return;

        // Mission
        const missionText = document.getElementById('cms-about-mission');
        if (missionText && data.mission) {
            missionText.innerHTML = data.mission.map(p => `<p>${p}</p>`).join('');
        }

        const missionHighlights = document.getElementById('cms-about-highlights');
        if (missionHighlights && data.highlights) {
            missionHighlights.innerHTML = data.highlights.map(h => `
                <div class="highlight-card">
                    <h4>${h.title}</h4>
                    <p>${h.text}</p>
                </div>
            `).join('');
        }

        // Legal
        const legalText = document.getElementById('cms-about-legal');
        if (legalText && data.legal) {
            legalText.innerHTML = data.legal.map(p => `<p>${p}</p>`).join('');
        }

        const legalCards = document.getElementById('cms-about-legal-cards');
        if (legalCards && data.legalCards) {
            legalCards.innerHTML = data.legalCards.map(c => `
                <div class="highlight-card">
                    <h4>${c.title}</h4>
                    <p>${c.text}</p>
                </div>
            `).join('');
        }

        this.observeReveals();
    },

    // =========================================
    // TEAM PAGE
    // =========================================
    async renderTeam() {
        const data = await this.fetchJSON('team.json');
        if (!data) return;

        // PI
        const piEl = document.getElementById('cms-team-pi');
        if (piEl && data.pi) {
            const pi = data.pi;
            piEl.innerHTML = `
                <div class="team-pi reveal reveal-delay-1">
                    <div class="team-pi-photo">${pi.initials}</div>
                    <div class="team-pi-info">
                        <h3>${pi.name}</h3>
                        <div class="team-pi-role">${pi.role}</div>
                        <div class="team-pi-affiliation">${pi.affiliation}</div>
                        ${pi.bio.map(b => `<p class="team-pi-bio">${b}</p>`).join('')}
                        <div class="team-pi-links">
                            <a href="mailto:${pi.email}" class="team-link">&#x2709; Email</a>
                            ${pi.website ? `<a href="${pi.website}" target="_blank" rel="noopener" class="team-link">&#x1F3DB; CEPAP</a>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        // Core
        const coreEl = document.getElementById('cms-team-core');
        if (coreEl && data.core) {
            coreEl.innerHTML = data.core.map((m, i) => `
                <div class="team-card reveal reveal-delay-${(i % 4) + 1}">
                    <h4>${m.name}</h4>
                    <div class="team-card-role">${m.role}</div>
                    <div class="team-card-affiliation">${m.affiliation}</div>
                </div>
            `).join('');
        }

        // Partners
        const partnersEl = document.getElementById('cms-team-partners');
        if (partnersEl && data.partners) {
            partnersEl.innerHTML = data.partners.map((m, i) => `
                <div class="team-card reveal reveal-delay-${(i % 4) + 1}">
                    <h4>${m.name}</h4>
                    <div class="team-card-role">${m.role}</div>
                    <div class="team-card-affiliation">${m.affiliation}</div>
                </div>
            `).join('');
        }

        this.observeReveals();
    },

    // =========================================
    // PUBLICATIONS PAGE
    // =========================================
    async renderPublications() {
        const [pubs, funding] = await Promise.all([
            this.fetchJSON('publications.json'),
            this.fetchJSON('funding.json')
        ]);

        // Publications list
        const pubsEl = document.getElementById('cms-publications');
        if (pubsEl && pubs) {
            pubsEl.innerHTML = pubs.map((p, i) => `
                <div class="pub-item reveal reveal-delay-${(i % 4) + 1}">
                    <div class="pub-year">${p.year}</div>
                    <div class="pub-content">
                        <h4>${p.title} <span class="pub-badge ${p.status}">${this.statusLabel(p.status)}</span></h4>
                        <div class="pub-authors">${p.authors}</div>
                        <div class="pub-venue">${p.venue}</div>
                    </div>
                </div>
            `).join('');
        }

        // Funding
        const fundingEl = document.getElementById('cms-funding');
        if (fundingEl && funding) {
            fundingEl.innerHTML = funding.map((f, i) => `
                <div class="project-card reveal reveal-delay-${(i % 4) + 1}">
                    <div class="project-card-icon">${f.icon}</div>
                    <h4>${f.name}</h4>
                    <p>${f.description}</p>
                    <div class="project-card-tags">
                        ${f.tags.map(t => `<span class="project-card-tag">${t}</span>`).join('')}
                    </div>
                </div>
            `).join('');
        }

        this.observeReveals();
    },

    // =========================================
    // RESEARCH / PROJECTS PAGE
    // =========================================
    async renderResearch() {
        const data = await this.fetchJSON('projects.json');
        if (!data) return;

        // Featured
        const featuredEl = document.getElementById('cms-project-featured');
        if (featuredEl && data.featured) {
            const f = data.featured;
            featuredEl.innerHTML = `
                <div class="project-featured-label">${f.label}</div>
                <h3>${f.title}</h3>
                <p class="tagline">${f.tagline}</p>
                <p>${f.description}</p>
                <div class="project-featured-stats">
                    ${f.stats.map(s => `
                        <div class="pf-stat">
                            <span class="pf-stat-num">${s.number}</span>
                            <span class="pf-stat-label">${s.label}</span>
                        </div>
                    `).join('')}
                </div>
                <a href="${f.link}" class="btn btn-primary btn-sm">Explore TRANSACT &rarr;</a>
            `;
        }

        // Grid
        const gridEl = document.getElementById('cms-projects-grid');
        if (gridEl && data.grid) {
            gridEl.innerHTML = data.grid.map((p, i) => `
                <div class="project-card reveal reveal-delay-${(i % 4) + 1}">
                    <div class="project-card-icon">${p.icon}</div>
                    <h4>${p.title}</h4>
                    <p>${p.description}</p>
                    <div class="project-card-tags">
                        ${p.tags.map(t => `<span class="project-card-tag">${t}</span>`).join('')}
                    </div>
                </div>
            `).join('');
        }

        this.observeReveals();
    },

    // =========================================
    // EVENTS PAGE
    // =========================================
    async renderEvents() {
        const data = await this.fetchJSON('events.json');
        if (!data) return;

        const el = document.getElementById('cms-events');
        if (!el) return;

        el.innerHTML = data.map((e, i) => `
            <div class="event-item reveal reveal-delay-${(i % 4) + 1}">
                <div class="event-date">${e.date}</div>
                <h4>${e.title}</h4>
                <div class="event-location">${e.location}</div>
                <p class="event-description">${e.description}</p>
            </div>
        `).join('');

        this.observeReveals();
    },

    // =========================================
    // NETWORK PAGE
    // =========================================
    async renderNetwork() {
        const data = await this.fetchJSON('network.json');
        if (!data) return;

        const academicEl = document.getElementById('cms-network-academic');
        if (academicEl && data.academic) {
            academicEl.innerHTML = data.academic.map((n, i) => `
                <div class="network-card reveal reveal-delay-${(i % 4) + 1}">
                    <div class="network-card-flag">${n.flag}</div>
                    <h4>${n.name}</h4>
                    <div class="network-card-country">${n.country}</div>
                    <p>${n.description}</p>
                </div>
            `).join('');
        }

        const civilEl = document.getElementById('cms-network-civil');
        if (civilEl && data.civil_society) {
            civilEl.innerHTML = data.civil_society.map((n, i) => `
                <div class="network-card reveal reveal-delay-${(i % 4) + 1}">
                    <div class="network-card-flag">${n.flag}</div>
                    <h4>${n.name}</h4>
                    <div class="network-card-country">${n.country}</div>
                    <p>${n.description}</p>
                </div>
            `).join('');
        }

        this.observeReveals();
    },

    // =========================================
    // CONTACT PAGE
    // =========================================
    async renderContact() {
        const data = await this.fetchJSON('contact.json');
        if (!data) return;

        const infoEl = document.getElementById('cms-contact-info');
        if (infoEl) {
            infoEl.innerHTML = `
                <div class="contact-item">
                    <div class="contact-item-icon">&#x1F3DB;</div>
                    <div class="contact-item-text">
                        <h4>Research Centre</h4>
                        <p>${data.centre}</p>
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-item-icon">&#x1F4CD;</div>
                    <div class="contact-item-text">
                        <h4>Address</h4>
                        <p>${data.address}</p>
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-item-icon">&#x2709;</div>
                    <div class="contact-item-text">
                        <h4>Email</h4>
                        <p><a href="mailto:${data.email}">${data.email}</a></p>
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-item-icon">&#x1F4DE;</div>
                    <div class="contact-item-text">
                        <h4>Phone</h4>
                        <p>${data.phone}</p>
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-item-icon">&#x1F310;</div>
                    <div class="contact-item-text">
                        <h4>CEPAP Website</h4>
                        <p><a href="${data.website}" target="_blank" rel="noopener noreferrer">${data.websiteLabel}</a></p>
                    </div>
                </div>
            `;
        }

        const mapEl = document.getElementById('cms-contact-map');
        if (mapEl && data.mapEmbedUrl) {
            mapEl.innerHTML = `
                <iframe
                    src="${data.mapEmbedUrl}"
                    width="100%"
                    height="100%"
                    style="border:0; min-height: 300px;"
                    allowfullscreen=""
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                    title="CEPAP, Avenue Jeanne 52, 1050 Brussels">
                </iframe>
            `;
        }

        this.observeReveals();
    },

    // =========================================
    // TRANSACT PAGE
    // =========================================
    async renderTransact() {
        const data = await this.fetchJSON('transact.json');
        if (!data) return;

        // Overview
        const overviewEl = document.getElementById('cms-transact-overview');
        if (overviewEl && data.overview) {
            const o = data.overview;
            overviewEl.innerHTML = `
                <div class="project-featured-label">${o.label}</div>
                <h3>${o.title}</h3>
                <p class="tagline">${o.tagline}</p>
                ${o.paragraphs.map(p => `<p>${p}</p>`).join('')}
                <div class="project-featured-stats">
                    ${o.stats.map(s => `
                        <div class="pf-stat">
                            <span class="pf-stat-num">${s.number}</span>
                            <span class="pf-stat-label">${s.label}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Methodology steps
        const stepsEl = document.getElementById('cms-transact-steps');
        if (stepsEl && data.methodology) {
            stepsEl.innerHTML = data.methodology.map(m => `
                <div class="method-step">
                    <div class="method-step-num">${m.step}</div>
                    <div class="method-step-content">
                        <h4>${m.title}</h4>
                        <p>${m.description}</p>
                    </div>
                </div>
            `).join('');
        }

        // Profiles
        const profilesEl = document.getElementById('cms-transact-profiles');
        if (profilesEl && data.profiles) {
            profilesEl.innerHTML = data.profiles.map(p => `
                <div class="treatment-item">
                    <div class="treatment-letter">${p.letter}</div>
                    <span><strong>${p.label}</strong> &mdash; ${p.description}</span>
                </div>
            `).join('');
        }

        // Findings
        const findingsEl = document.getElementById('cms-transact-findings');
        if (findingsEl && data.findings) {
            findingsEl.innerHTML = data.findings.map((f, i) => `
                <div class="finding-card reveal reveal-delay-${(i % 4) + 1}">
                    <div class="finding-card-icon">${f.icon}</div>
                    ${f.stat ? `<span class="finding-stat">${f.stat}</span>` : ''}
                    <h4>${f.title}</h4>
                    <p>${f.description}</p>
                </div>
            `).join('');
        }

        // Expansion
        const expansionEl = document.getElementById('cms-transact-expansion');
        if (expansionEl && data.expansion) {
            expansionEl.innerHTML = data.expansion.map((e, i) => `
                <div class="project-card reveal reveal-delay-${(i % 4) + 1}">
                    <div class="project-card-icon">${e.icon}</div>
                    <h4>${e.country}</h4>
                    <p>${e.description}</p>
                    <div class="project-card-tags">
                        ${e.tags.map(t => `<span class="project-card-tag">${t}</span>`).join('')}
                    </div>
                </div>
            `).join('');
        }

        this.observeReveals();
    },

    // =========================================
    // HELPERS
    // =========================================
    statusLabel(status) {
        const labels = {
            'published': 'Published',
            'submitted': 'Submitted',
            'in-progress': 'In Progress'
        };
        return labels[status] || status;
    }
};

// Auto-detect which page we're on and render
document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.cmsPage;
    if (!page) return;

    const renderers = {
        'home': () => CMS.renderHome(),
        'about': () => CMS.renderAbout(),
        'team': () => CMS.renderTeam(),
        'publications': () => CMS.renderPublications(),
        'research': () => CMS.renderResearch(),
        'events': () => CMS.renderEvents(),
        'network': () => CMS.renderNetwork(),
        'contact': () => CMS.renderContact(),
        'transact': () => CMS.renderTransact()
    };

    if (renderers[page]) {
        renderers[page]();
    }
});
