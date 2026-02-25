# FOI Research Group Website — Maintenance Guide

This guide explains how to update the website. The site is a **multi-page** HTML site with shared CSS and JS. No build tools or frameworks are needed — just edit the files directly.

---

## File Structure

```
foi-research-group/
├── index.html          ← Home page (hero + preview sections)
├── about.html          ← About the research group + Belgian FOI context
├── research.html       ← All research projects
├── transact.html       ← TRANSACT project deep-dive
├── team.html           ← Team members
├── publications.html   ← Publications & grants
├── events.html         ← Events timeline
├── network.html        ← International partners
├── contact.html        ← Contact details + map
├── css/
│   └── style.css       ← All visual styling (shared across pages)
├── js/
│   └── main.js         ← Animations, mobile nav, scroll effects (shared)
├── assets/
│   ├── images/         ← Team photos, project images
│   └── docs/           ← PDFs (downloadable publications)
└── MAINTENANCE.md      ← This file
```

### Page Structure

Every page shares the same **navbar** and **footer**. When editing navigation links or footer links, you must update them in **all 9 HTML files** to keep them consistent.

---

## Common Tasks

### Add a Team Member

Edit `team.html`. Find the `<div class="team-grid">` and add a new card:

```html
<div class="team-card reveal reveal-delay-1">
    <h4>Dr. New Person</h4>
    <div class="team-card-role">Role Description</div>
    <div class="team-card-affiliation">University Name, Country</div>
</div>
```

### Add a Publication

Edit `publications.html`. Find the `<div class="publications-list">` section. Add a new item:

```html
<div class="pub-item reveal reveal-delay-1">
    <div class="pub-year">2026</div>
    <div class="pub-content">
        <h4>Paper Title <span class="pub-badge published">Published</span></h4>
        <div class="pub-authors">Author1, A., Author2, B.</div>
        <div class="pub-venue">Journal Name, Vol. X, pp. X–X</div>
    </div>
</div>
```

Badge options: `published` (green), `submitted` (yellow), `in-progress` (blue).

**Also update** `index.html` if you want the publication to appear in the "Latest Output" preview on the home page.

### Add an Event

Edit `events.html`. Find the `<div class="events-timeline">` section. Add a new item at the top (most recent first):

```html
<div class="event-item reveal reveal-delay-1">
    <div class="event-date">Month Year • City, Country</div>
    <h4>Event Name</h4>
    <div class="event-location">Venue</div>
    <p class="event-description">Description of what happened or will happen.</p>
</div>
```

### Add a Network Partner

Edit `network.html`. Find the `<div class="network-grid">` section. Add a new card:

```html
<div class="network-card reveal reveal-delay-1">
    <div class="network-card-flag">🇫🇷</div>
    <h4>Institution Name</h4>
    <div class="network-card-country">Country</div>
    <p>Brief description of the collaboration.</p>
</div>
```

For flag emojis, search "country flag emoji" online.

### Change Text

Search for the text you want to change in the relevant HTML file and edit it directly. All content is in plain HTML with no special syntax.

**Which file to edit:**
| Content | File |
|---------|------|
| Home hero, preview cards | `index.html` |
| Mission, FOI legal context | `about.html` |
| Research projects overview | `research.html` |
| TRANSACT methodology & findings | `transact.html` |
| Team members & bios | `team.html` |
| Papers, grants | `publications.html` |
| Events timeline | `events.html` |
| Partner institutions | `network.html` |
| Address, email, phone | `contact.html` |

### Add a Downloadable PDF

1. Place the PDF in `assets/docs/`
2. Link to it anywhere in the HTML:
```html
<a href="assets/docs/filename.pdf" target="_blank">Download PDF</a>
```

### Add a Team Photo

1. Place the image in `assets/images/` (use `.jpg` or `.webp`, keep under 200KB)
2. In `team.html`, replace the placeholder initials div with an `<img>` tag:

```html
<!-- Replace this: -->
<div class="team-pi-photo">GE</div>

<!-- With this: -->
<div class="team-pi-photo">
    <img src="assets/images/esposito.jpg" alt="Prof. Giovanni Esposito" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">
</div>
```

### Add a New Page

1. Copy any existing page (e.g., `about.html`)
2. Change the `<title>` and page header content
3. Replace the content sections
4. Add a link to the new page in the navbar and footer of **all** HTML files

---

## How to Edit with AI Assistants

You can paste any HTML file into ChatGPT, Claude, or similar tools and ask:

- "Add a new team member named Dr. X from Y university" (paste `team.html`)
- "Update the publication 'Selective Transparency' to say it's published in Journal Z" (paste `publications.html`)
- "Add a new event for EGPA 2027 in Madrid" (paste `events.html`)
- "Change the phone number to +32 XXX" (paste `contact.html`)

The AI will return the modified HTML. Copy and paste it back.

---

## Deploying Changes

If hosted on GitHub Pages:
1. Edit files on GitHub.com directly, or
2. Use git locally:
```bash
git add -A
git commit -m "Update website content"
git push
```

Changes appear live within 1–2 minutes.

---

## Styling Notes

- **Colors**: Defined as CSS custom properties in `style.css` (top of file). Change `--blue-deep`, `--gold`, etc. to update the entire colour scheme.
- **Fonts**: Using Google Fonts (Playfair Display + Inter). Change in the `<head>` of each HTML file and in CSS custom properties.
- **Animations**: Elements with class `reveal` fade in on scroll. Add `reveal-delay-1` through `reveal-delay-4` for staggered animation.
- **Responsive**: The site is fully responsive. Test on mobile after changes.
- **Navbar**: Active page is marked with `class="active"` on the nav link. Update this when copying page templates.
