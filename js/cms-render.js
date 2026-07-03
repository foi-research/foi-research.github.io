/* ============================================
   FOI Research Group — CMS Rendering Engine
   Loads JSON data and renders page content

   Inline-editing annotations:
     data-edit="FILE:dot.path"          -> editable scalar text (bound to JSON field)
     data-edit-array="FILE:dot.path"    -> a container whose children are array items
     data-edit-index="N"                -> marks one array item (enables delete/reorder/add)
   These attributes are inert unless js/editor.js is active (edit mode).
   ============================================ */

const CMS = {
    dataCache: {},

    async fetchJSON(file) {
        if (this.dataCache[file]) return this.dataCache[file];
        try {
            const resp = await fetch('data/' + file, { cache: 'no-store' });
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

    // Notify the inline editor (if loaded) that fresh content is in the DOM
    notifyEditor() {
        if (window.FOIEditor && typeof window.FOIEditor.refresh === 'function') {
            window.FOIEditor.refresh();
        }
    },

    done() {
        this.observeReveals();
        this.notifyEditor();
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
                ${h.badge ? `<div class="hero-badge">
                    <div class="hero-badge-dot"></div>
                    <span data-edit="home.json:hero.badge">${h.badge}</span>
                </div>` : ''}
                <h1 data-edit="home.json:hero.title">${h.title}</h1>
                <p class="hero-description" data-edit="home.json:hero.description">${h.description}</p>
                <div class="hero-actions">
                    <a href="${h.primaryBtn.link}" class="btn btn-primary"><span data-edit="home.json:hero.primaryBtn.text">${h.primaryBtn.text}</span></a>
                    <a href="${h.secondaryBtn.link}" class="btn btn-outline"><span data-edit="home.json:hero.secondaryBtn.text">${h.secondaryBtn.text}</span></a>
                </div>
            `;
        }

        // Intro paragraphs (TRANSACT overview)
        const introEl = document.getElementById('cms-home-intro');
        if (introEl && home.intro) {
            introEl.setAttribute('data-edit-array', 'home.json:intro');
            introEl.innerHTML = home.intro.map((p, i) =>
                `<p data-edit-index="${i}" data-edit="home.json:intro.${i}">${p}</p>`).join('');
        }

        // Research cards
        const cardsEl = document.getElementById('cms-research-cards');
        if (cardsEl && home.researchCards) {
            cardsEl.setAttribute('data-edit-array', 'home.json:researchCards');
            cardsEl.innerHTML = home.researchCards.map((card, i) => `
                <a href="${card.link}" class="home-card reveal reveal-delay-${i + 1}" data-edit-index="${i}">
                    <div class="home-card-icon" data-edit="home.json:researchCards.${i}.icon">${card.icon}</div>
                    <h3 data-edit="home.json:researchCards.${i}.title">${card.title}</h3>
                    <p data-edit="home.json:researchCards.${i}.description">${card.description}</p>
                    <span class="card-arrow">Learn more &rarr;</span>
                </a>
            `).join('');
        }

        // Publications preview (show items with showOnHome=true)
        const pubsEl = document.getElementById('cms-home-publications');
        if (pubsEl && pubs) {
            const pubList = pubs.items || pubs;
            const homePubs = pubList.filter(p => p.showOnHome);
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
                    <p style="font-size: 1.05rem; color: var(--gray-600); max-width: 720px; line-height: 1.8; margin-bottom: 1.5rem;" data-edit="home.json:teamPreview">
                        ${home.teamPreview}
                    </p>
                    <a href="team.html" class="btn btn-secondary btn-sm">Meet the team &rarr;</a>
                </div>
            `;
        }

        this.done();
    },

    // =========================================
    // ABOUT PAGE  (TRANSACT content)
    // =========================================
    async renderAbout() {
        const data = await this.fetchJSON('about.json');
        if (!data) return;

        const el = document.getElementById('cms-about-body');
        if (!el || !data.blocks) return;
        // two figures floated right at different heights: map high (block 0), chart lower (block 2)
        const chartFig = `<figure class="float-figure"><img src="assets/about/foi-adoption.jpg" alt="Adoption of access to information laws, 1950-2020" data-img="assets/about/foi-adoption.jpg" loading="lazy"/><figcaption>Adoption of access to information laws by regime, 1950&ndash;2020. Source: article19.org</figcaption></figure>`;
        const mapFig = `<figure class="float-figure map-fig"><img src="assets/team/coverage-map.png" alt="Countries covered by the TRANSACT network" data-img="assets/team/coverage-map.png" loading="lazy"/><figcaption>Countries covered by the TRANSACT network</figcaption></figure>`;
        el.setAttribute('data-edit-array', 'about.json:blocks');
        el.innerHTML = data.blocks.map((b, i) => {
            const base = `about.json:blocks.${i}`;
            const pre = i === 0 ? mapFig : (i === 2 ? chartFig : '');
            if (b.type === 'h')  return pre + `<h2 class="about-h2" data-edit-index="${i}" data-edit="${base}.text">${b.text}</h2>`;
            if (b.type === 'h3') return pre + `<h3 class="about-h3" data-edit-index="${i}" data-edit="${base}.text">${b.text}</h3>`;
            if (b.type === 'ul') return pre + `<ul class="about-ul" data-edit-index="${i}">${(b.items || []).map((it, j) =>
                `<li data-edit="${base}.items.${j}">${it}</li>`).join('')}</ul>`;
            return pre + `<p data-edit-index="${i}" data-edit="${base}.text">${b.text}</p>`;
        }).join('');

        this.done();
    },

    // =========================================
    // TEAM PAGE  (grouped: PI, Co-PI, Advisory Board, Research Team,
    //             Local Research Teams [subgroups], Collaborators)
    // =========================================
    initials(name) {
        return (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    },
    memberCard(base, i, m) {
        const avatar = m.photo
            ? `<img class="team-photo" src="${m.photo}" alt="${m.name}" loading="lazy"/>`
            : `<div class="team-photo team-avatar" aria-hidden="true">${this.initials(m.name)}</div>`;
        return `
            <div class="team-card reveal reveal-delay-${(i % 4) + 1} has-photo" data-edit-index="${i}">
                ${avatar}
                <div class="team-card-body">
                    <h4 data-edit="${base}.${i}.name">${m.name}</h4>
                    ${m.role ? `<div class="team-card-role" data-edit="${base}.${i}.role">${m.role}</div>` : ''}
                    <div class="team-card-affiliation" data-edit="${base}.${i}.affiliation">${m.affiliation}</div>
                </div>
            </div>`;
    },
    async renderTeam() {
        const data = await this.fetchJSON('team.json');
        if (!data || !data.groups) return;

        const el = document.getElementById('cms-team-groups');
        if (!el) return;

        el.innerHTML = data.groups.map((g, gi) => {
            let inner = '';
            if (g.members) {
                const base = `team.json:groups.${gi}.members`;
                inner = `<div class="team-grid" data-edit-array="${base}">
                    ${g.members.map((m, i) => this.memberCard(base, i, m)).join('')}
                </div>`;
            } else if (g.subgroups) {
                inner = g.subgroups.map((sg, si) => {
                    const base = `team.json:groups.${gi}.subgroups.${si}.members`;
                    return `
                        <h4 class="team-subheading" data-edit="team.json:groups.${gi}.subgroups.${si}.subheading">${sg.subheading}</h4>
                        <div class="team-grid" data-edit-array="${base}">
                            ${sg.members.map((m, i) => this.memberCard(base, i, m)).join('')}
                        </div>`;
                }).join('');
            }
            return `
                <div class="team-group reveal">
                    <h3 class="team-members-title" data-edit="team.json:groups.${gi}.heading">${g.heading}</h3>
                    ${inner}
                </div>`;
        }).join('');

        this.done();
    },

    // =========================================
    // PARTNERS PAGE
    // =========================================
    async renderPartners() {
        const data = await this.fetchJSON('partners.json');
        if (!data) return;

        const introEl = document.getElementById('cms-partners-intro');
        if (introEl && data.intro !== undefined) {
            introEl.innerHTML = `<p data-edit="partners.json:intro">${data.intro}</p>`;
        }

        const el = document.getElementById('cms-partners');
        if (!el) return;
        const list = data.items || [];
        el.setAttribute('data-edit-array', 'partners.json:items');
        el.innerHTML = list.map((n, i) => `
            <div class="partner-card reveal reveal-delay-${(i % 4) + 1}" data-edit-index="${i}">
                ${n.logo ? `<div class="partner-logo">${n.link
                    ? `<a href="${n.link}" target="_blank" rel="noopener"><img src="${n.logo}" alt="${n.name} logo" data-img="partners.json:items.${i}.logo" loading="lazy"/></a>`
                    : `<img src="${n.logo}" alt="${n.name} logo" data-img="partners.json:items.${i}.logo" loading="lazy"/>`}</div>` : ''}
                <h4>${n.link
                    ? `<a href="${n.link}" target="_blank" rel="noopener"><span data-edit="partners.json:items.${i}.name">${n.name}</span></a>`
                    : `<span data-edit="partners.json:items.${i}.name">${n.name}</span>`}</h4>
                <p data-edit="partners.json:items.${i}.description">${n.description || ''}</p>
                ${n.link ? `<a class="partner-link" href="${n.link}" target="_blank" rel="noopener">Visit website &rarr;</a>` : ''}
            </div>
        `).join('');
        this.done();
    },

    // =========================================
    // MEDIAS PAGE
    // =========================================
    async renderMedias() {
        const data = await this.fetchJSON('medias.json');
        if (!data) return;

        const introEl = document.getElementById('cms-media-intro');
        if (introEl && data.intro !== undefined) {
            introEl.innerHTML = `<p data-edit="medias.json:intro">${data.intro}</p>`;
        }

        // photo gallery (each photo links to a section/project)
        const gEl = document.getElementById('cms-media-gallery');
        if (gEl) {
            const gallery = data.gallery || [];
            gEl.setAttribute('data-edit-array', 'medias.json:gallery');
            gEl.innerHTML = gallery.map((p, i) => `
                <a class="media-photo" href="${p.link || '#'}" data-edit-index="${i}">
                    <img src="${p.image}" alt="${p.alt || ''}" loading="lazy"/>
                    ${p.caption ? `<span class="media-photo-cap" data-edit="medias.json:gallery.${i}.caption">${p.caption}</span>` : ''}
                </a>`).join('');
        }

        // outreach sections (text + external link)
        const sEl = document.getElementById('cms-media-sections');
        if (sEl) {
            const sections = data.sections || [];
            sEl.setAttribute('data-edit-array', 'medias.json:sections');
            sEl.innerHTML = sections.map((x, i) => {
                const b = `medias.json:sections.${i}`;
                return `<div class="media-block" data-edit-index="${i}">
                    <span class="contrib-type" data-edit="${b}.category">${x.category}</span>
                    <h4 class="media-block-title" data-edit="${b}.title">${x.title}</h4>
                    <p class="media-block-desc" data-edit="${b}.description">${x.description}</p>
                    ${x.link ? `<a class="media-block-link" href="${x.link}" target="_blank" rel="noopener"><span data-edit="${b}.linkText">${x.linkText || 'Open'}</span> &rarr;</a>` : ''}
                </div>`;
            }).join('');
        }

        this.done();
    },

    // =========================================
    // PUBLICATIONS PAGE
    // =========================================
    async renderPublications() {
        const data = await this.fetchJSON('publications.json');
        if (!data) return;

        const introEl = document.getElementById('cms-publications-intro');
        if (introEl && data.intro !== undefined) {
            introEl.innerHTML = `<p data-edit="publications.json:intro">${data.intro}</p>`;
        }

        const el = document.getElementById('cms-publications');
        if (!el) return;
        el.innerHTML = (data.groups || []).map((g, gi) => {
            const base = `publications.json:groups.${gi}.items`;
            return `<div class="pub-group">
                <h3 class="team-members-title" data-edit="publications.json:groups.${gi}.heading">${g.heading}</h3>
                <div data-edit-array="${base}">
                    ${g.items.map((it, i) => `
                        <div class="pub-ref" data-edit-index="${i}">
                            <p class="pub-citation" data-edit="${base}.${i}.citation">${it.citation}</p>
                            ${it.link ? `<a class="pub-link" href="${it.link}" target="_blank" rel="noopener">${it.link}</a>` : ''}
                        </div>`).join('')}
                </div>
            </div>`;
        }).join('');

        this.done();
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
                <div class="project-featured-label" data-edit="projects.json:featured.label">${f.label}</div>
                <h3 data-edit="projects.json:featured.title">${f.title}</h3>
                <p class="tagline" data-edit="projects.json:featured.tagline">${f.tagline}</p>
                <p data-edit="projects.json:featured.description">${f.description}</p>
                <div class="project-featured-stats" data-edit-array="projects.json:featured.stats">
                    ${f.stats.map((s, i) => `
                        <div class="pf-stat" data-edit-index="${i}">
                            <span class="pf-stat-num" data-edit="projects.json:featured.stats.${i}.number">${s.number}</span>
                            <span class="pf-stat-label" data-edit="projects.json:featured.stats.${i}.label">${s.label}</span>
                        </div>
                    `).join('')}
                </div>
                <a href="${f.link}" class="btn btn-primary btn-sm">Explore TRANSACT &rarr;</a>
            `;
        }

        // Grid
        const gridEl = document.getElementById('cms-projects-grid');
        if (gridEl && data.grid) {
            gridEl.setAttribute('data-edit-array', 'projects.json:grid');
            gridEl.innerHTML = data.grid.map((p, i) => `
                <div class="project-card reveal reveal-delay-${(i % 4) + 1}" data-edit-index="${i}">
                    <div class="project-card-icon" data-edit="projects.json:grid.${i}.icon">${p.icon}</div>
                    <h4 data-edit="projects.json:grid.${i}.title">${p.title}</h4>
                    <p data-edit="projects.json:grid.${i}.description">${p.description}</p>
                    <div class="project-card-tags">
                        ${p.tags.map(t => `<span class="project-card-tag">${t}</span>`).join('')}
                    </div>
                </div>
            `).join('');
        }

        this.done();
    },

    // =========================================
    // EVENTS PAGE
    // =========================================
    async renderEvents() {
        const data = await this.fetchJSON('events.json');
        if (!data) return;
        const el = document.getElementById('cms-events');
        if (!el) return;
        el.removeAttribute('data-edit-array');

        let html = '';
        if (data.intro !== undefined) {
            html += `<p class="events-intro" data-edit="events.json:intro">${data.intro}</p>`;
        }
        (data.years || []).forEach((y, yi) => {
            html += `<div class="events-year reveal">
                <h3 class="events-year-title" data-edit="events.json:years.${yi}.year">${y.year}</h3>
                <div data-edit-array="events.json:years.${yi}.events">`;
            (y.events || []).forEach((e, ei) => {
                const base = `events.json:years.${yi}.events.${ei}`;
                html += `<div class="event-item" data-edit-index="${ei}">
                    <h4 class="event-venue" data-edit="${base}.name">${e.name}</h4>
                    <div class="event-meta">
                        <span class="event-location" data-edit="${base}.location">${e.location}</span>
                        <span class="event-dot">&middot;</span>
                        <span class="event-date" data-edit="${base}.date">${e.date}</span>
                    </div>
                    <div class="event-contribs" data-edit-array="${base}.items">`;
                (e.items || []).forEach((it, ii) => {
                    const ib = `${base}.items.${ii}`;
                    html += `<div class="event-contrib" data-edit-index="${ii}">
                        ${it.type ? `<span class="contrib-type" data-edit="${ib}.type">${it.type}</span>` : ''}
                        <div class="contrib-title" data-edit="${ib}.title">${it.title}</div>
                        <div class="contrib-lines" data-edit-array="${ib}.lines">
                            ${(it.lines || []).map((ln, li) =>
                                `<div class="contrib-line" data-edit-index="${li}" data-edit="${ib}.lines.${li}">${ln}</div>`).join('')}
                        </div>
                    </div>`;
                });
                html += `</div>`; // close .event-contribs
                if (e.images && e.images.length) {
                    html += `<div class="event-photos">` + e.images.map((im) =>
                        `<a class="event-photo" href="${im.image}" data-img="${im.image}" title="${im.caption || ''}">
                            <img src="${im.image}" alt="${im.caption || ''}" loading="lazy"/>
                        </a>`).join('') + `</div>`;
                }
                if (e.files && e.files.length) {
                    html += `<div class="event-files">` + e.files.map((f) =>
                        f.thumb
                          ? `<a class="slide-card" href="${f.url}" data-pdf="${f.url}" title="PowerPoint">
                                <img src="${f.thumb}" alt="${f.label}" loading="lazy"/>
                                <span class="slide-overlay">PowerPoint</span>
                                <span class="slide-label">${f.label}</span>
                             </a>`
                          : `<a class="event-file" href="${f.url}" target="_blank" rel="noopener">&#x1F4C4; ${f.label}</a>`).join('') + `</div>`;
                }
                if (e.links && e.links.length) {
                    html += `<div class="event-links">` + e.links.map((l) =>
                        `<a class="event-link" href="${l.url}" target="_blank" rel="noopener">${l.label} &rarr;</a>`).join('') + `</div>`;
                }
                if (e.trailingImages && e.trailingImages.length) {
                    html += `<div class="event-photos">` + e.trailingImages.map((im) =>
                        `<a class="event-photo" href="${im.image}" data-img="${im.image}" title="${im.caption || ''}">
                            <img src="${im.image}" alt="${im.caption || ''}" loading="lazy"/>
                        </a>`).join('') + `</div>`;
                }
                html += `</div>`; // close .event-item
            });
            html += `</div></div>`;
            // scatter a photo between year blocks for visual breathing room
            const ph = (data.photos || [])[yi];
            if (ph) {
                html += `<figure class="events-figure">
                    <img src="${ph.image}" alt="${ph.caption || ''}" data-img="${ph.image}" loading="lazy"/>
                    ${ph.caption ? `<figcaption>${ph.caption}</figcaption>` : ''}
                </figure>`;
            }
        });
        el.innerHTML = html;
        this.done();
    },

    // =========================================
    // NETWORK PAGE
    // =========================================
    async renderNetwork() {
        const data = await this.fetchJSON('network.json');
        if (!data) return;

        const academicEl = document.getElementById('cms-network-academic');
        if (academicEl && data.academic) {
            academicEl.setAttribute('data-edit-array', 'network.json:academic');
            academicEl.innerHTML = data.academic.map((n, i) => `
                <div class="network-card reveal reveal-delay-${(i % 4) + 1}" data-edit-index="${i}">
                    <div class="network-card-flag" data-edit="network.json:academic.${i}.flag">${n.flag}</div>
                    <h4 data-edit="network.json:academic.${i}.name">${n.name}</h4>
                    <div class="network-card-country" data-edit="network.json:academic.${i}.country">${n.country}</div>
                    <p data-edit="network.json:academic.${i}.description">${n.description}</p>
                </div>
            `).join('');
        }

        const civilEl = document.getElementById('cms-network-civil');
        if (civilEl && data.civil_society) {
            civilEl.setAttribute('data-edit-array', 'network.json:civil_society');
            civilEl.innerHTML = data.civil_society.map((n, i) => `
                <div class="network-card reveal reveal-delay-${(i % 4) + 1}" data-edit-index="${i}">
                    <div class="network-card-flag" data-edit="network.json:civil_society.${i}.flag">${n.flag}</div>
                    <h4 data-edit="network.json:civil_society.${i}.name">${n.name}</h4>
                    <div class="network-card-country" data-edit="network.json:civil_society.${i}.country">${n.country}</div>
                    <p data-edit="network.json:civil_society.${i}.description">${n.description}</p>
                </div>
            `).join('');
        }

        this.done();
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
                        <p data-edit="contact.json:centre">${data.centre}</p>
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-item-icon">&#x1F4CD;</div>
                    <div class="contact-item-text">
                        <h4>Address</h4>
                        <p data-edit="contact.json:address">${data.address}</p>
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-item-icon">&#x2709;</div>
                    <div class="contact-item-text">
                        <h4>Email</h4>
                        <p><a href="mailto:${data.email}"><span data-edit="contact.json:email">${data.email}</span></a></p>
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-item-icon">&#x1F4DE;</div>
                    <div class="contact-item-text">
                        <h4>Phone</h4>
                        <p data-edit="contact.json:phone">${data.phone}</p>
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-item-icon">&#x1F310;</div>
                    <div class="contact-item-text">
                        <h4>CEPAP Website</h4>
                        <p><a href="${data.website}" target="_blank" rel="noopener noreferrer"><span data-edit="contact.json:websiteLabel">${data.websiteLabel}</span></a></p>
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

        this.done();
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
                <div class="project-featured-label" data-edit="transact.json:overview.label">${o.label}</div>
                <h3 data-edit="transact.json:overview.title">${o.title}</h3>
                <p class="tagline" data-edit="transact.json:overview.tagline">${o.tagline}</p>
                <div data-edit-array="transact.json:overview.paragraphs">
                    ${o.paragraphs.map((p, i) => `<p data-edit-index="${i}" data-edit="transact.json:overview.paragraphs.${i}">${p}</p>`).join('')}
                </div>
                <div class="project-featured-stats" data-edit-array="transact.json:overview.stats">
                    ${o.stats.map((s, i) => `
                        <div class="pf-stat" data-edit-index="${i}">
                            <span class="pf-stat-num" data-edit="transact.json:overview.stats.${i}.number">${s.number}</span>
                            <span class="pf-stat-label" data-edit="transact.json:overview.stats.${i}.label">${s.label}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Methodology steps
        const stepsEl = document.getElementById('cms-transact-steps');
        if (stepsEl && data.methodology) {
            stepsEl.setAttribute('data-edit-array', 'transact.json:methodology');
            stepsEl.innerHTML = data.methodology.map((m, i) => `
                <div class="method-step" data-edit-index="${i}">
                    <div class="method-step-num" data-edit="transact.json:methodology.${i}.step">${m.step}</div>
                    <div class="method-step-content">
                        <h4 data-edit="transact.json:methodology.${i}.title">${m.title}</h4>
                        <p data-edit="transact.json:methodology.${i}.description">${m.description}</p>
                    </div>
                </div>
            `).join('');
        }

        // Profiles
        const profilesEl = document.getElementById('cms-transact-profiles');
        if (profilesEl && data.profiles) {
            profilesEl.setAttribute('data-edit-array', 'transact.json:profiles');
            profilesEl.innerHTML = data.profiles.map((p, i) => `
                <div class="treatment-item" data-edit-index="${i}">
                    <div class="treatment-letter" data-edit="transact.json:profiles.${i}.letter">${p.letter}</div>
                    <span><strong data-edit="transact.json:profiles.${i}.label">${p.label}</strong> &mdash; <span data-edit="transact.json:profiles.${i}.description">${p.description}</span></span>
                </div>
            `).join('');
        }

        // Findings
        const findingsEl = document.getElementById('cms-transact-findings');
        if (findingsEl && data.findings) {
            findingsEl.setAttribute('data-edit-array', 'transact.json:findings');
            findingsEl.innerHTML = data.findings.map((f, i) => `
                <div class="finding-card reveal reveal-delay-${(i % 4) + 1}" data-edit-index="${i}">
                    <div class="finding-card-icon" data-edit="transact.json:findings.${i}.icon">${f.icon}</div>
                    ${f.stat ? `<span class="finding-stat" data-edit="transact.json:findings.${i}.stat">${f.stat}</span>` : ''}
                    <h4 data-edit="transact.json:findings.${i}.title">${f.title}</h4>
                    <p data-edit="transact.json:findings.${i}.description">${f.description}</p>
                </div>
            `).join('');
        }

        // Expansion
        const expansionEl = document.getElementById('cms-transact-expansion');
        if (expansionEl && data.expansion) {
            expansionEl.setAttribute('data-edit-array', 'transact.json:expansion');
            expansionEl.innerHTML = data.expansion.map((e, i) => `
                <div class="project-card reveal reveal-delay-${(i % 4) + 1}" data-edit-index="${i}">
                    <div class="project-card-icon" data-edit="transact.json:expansion.${i}.icon">${e.icon}</div>
                    <h4 data-edit="transact.json:expansion.${i}.country">${e.country}</h4>
                    <p data-edit="transact.json:expansion.${i}.description">${e.description}</p>
                    <div class="project-card-tags">
                        ${e.tags.map(t => `<span class="project-card-tag">${t}</span>`).join('')}
                    </div>
                </div>
            `).join('');
        }

        this.done();
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
        'transact': () => CMS.renderTransact(),
        'partners': () => CMS.renderPartners(),
        'medias': () => CMS.renderMedias()
    };

    if (renderers[page]) {
        renderers[page]();
    }
});

// Expose for the inline editor
window.CMS = CMS;
