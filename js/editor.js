/* ============================================
   FOI Research Group — Inline Visual Editor
   Double-click any text to edit it; add/delete list items;
   save commits the JSON back to the GitHub repo.

   - Activates only when you click the floating "Edit" button.
   - Saving requires GitHub login (OAuth via the same Cloudflare
     worker the /admin/ CMS uses). Anonymous visitors can toggle
     edit mode locally but cannot save (the GitHub API rejects it).
   ============================================ */
(function () {
    'use strict';

    const REPO = 'foi-research/foi-research.github.io';
    const BRANCH = 'main';
    const OAUTH_BASE = 'https://foi-cms-auth.eq-enrico.workers.dev';
    const TOKEN_KEY = 'foi_gh_token';

    const FOIEditor = {
        editing: false,
        token: null,
        dirty: new Set(),          // set of file names with unsaved changes
        _bound: false,

        // ---- boot ----
        init() {
            this.token = localStorage.getItem(TOKEN_KEY) || null;
            this.injectStyles();
            this.buildToolbar();
            this.updateToolbar();
        },

        // ---- JSON path helpers ----
        // pathSpec looks like "file.json:a.b.0.c"  (the part after ':' may be empty)
        splitSpec(spec) {
            const idx = spec.indexOf(':');
            const file = spec.slice(0, idx);
            let path = spec.slice(idx + 1);
            if (path.startsWith('.')) path = path.slice(1);
            const keys = path === '' ? [] : path.split('.');
            return { file, keys };
        },
        getAt(obj, keys) {
            let cur = obj;
            for (const k of keys) {
                if (cur == null) return undefined;
                cur = cur[k];
            }
            return cur;
        },
        setAt(obj, keys, value) {
            let cur = obj;
            for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
            cur[keys[keys.length - 1]] = value;
        },

        markDirty(file) {
            this.dirty.add(file);
            this.updateToolbar();
        },

        // ---- re-render current page from the (mutated) cache ----
        rerender() {
            const page = document.body.dataset.cmsPage;
            const map = {
                home: 'renderHome', about: 'renderAbout', team: 'renderTeam',
                publications: 'renderPublications', research: 'renderResearch',
                events: 'renderEvents', network: 'renderNetwork',
                contact: 'renderContact', transact: 'renderTransact'
            };
            if (window.CMS && map[page]) window.CMS[map[page]]();
            // CMS.done() will call FOIEditor.refresh() once the DOM is rebuilt
        },

        // ---- called by cms-render after every (re)render ----
        refresh() {
            if (!this.editing) return;
            this.decorate();
        },

        // ---- edit-mode on/off ----
        enable() {
            this.editing = true;
            document.body.classList.add('foi-editing');
            this.decorate();
            this.updateToolbar();
        },
        disable() {
            this.editing = false;
            document.body.classList.remove('foi-editing');
            document.querySelectorAll('[contenteditable="true"]').forEach(el => el.removeAttribute('contenteditable'));
            document.querySelectorAll('.foi-ctl').forEach(el => el.remove());
            this.updateToolbar();
        },
        toggle() {
            if (this.editing) { this.disable(); return; }
            if (!this.token) { this.login(() => this.enable()); return; }
            this.enable();
        },

        // ---- make elements interactive ----
        decorate() {
            // 1) text fields
            document.querySelectorAll('[data-edit]').forEach(el => {
                if (el._foiBound) return;
                el._foiBound = true;
                el.addEventListener('dblclick', (ev) => {
                    ev.preventDefault();
                    this.beginEdit(el);
                });
            });

            // 2) array controls (add / per-item delete + move)
            document.querySelectorAll('.foi-ctl').forEach(el => el.remove());
            document.querySelectorAll('[data-edit-array]').forEach(container => {
                const spec = container.getAttribute('data-edit-array');
                // per-item controls
                container.querySelectorAll(':scope > [data-edit-index]').forEach(item => {
                    const i = parseInt(item.getAttribute('data-edit-index'), 10);
                    const bar = document.createElement('div');
                    bar.className = 'foi-ctl foi-item-ctl';
                    bar.innerHTML =
                        '<button title="Move up" data-act="up">↑</button>' +
                        '<button title="Move down" data-act="down">↓</button>' +
                        '<button title="Delete" data-act="del">✕</button>';
                    bar.addEventListener('click', (ev) => {
                        const act = ev.target.getAttribute('data-act');
                        if (!act) return;
                        ev.preventDefault(); ev.stopPropagation();
                        if (act === 'del') this.deleteItem(spec, i);
                        else this.moveItem(spec, i, act === 'up' ? -1 : 1);
                    });
                    if (getComputedStyle(item).position === 'static') item.style.position = 'relative';
                    item.appendChild(bar);
                });
                // add button
                const add = document.createElement('button');
                add.className = 'foi-ctl foi-add-btn';
                add.type = 'button';
                add.textContent = '＋ Add item';
                add.addEventListener('click', (ev) => { ev.preventDefault(); this.addItem(spec); });
                container.appendChild(add);
            });
        },

        // read an element's editable HTML, ignoring any injected control bars
        innerHTMLClean(el) {
            const c = el.cloneNode(true);
            c.querySelectorAll('.foi-ctl').forEach(n => n.remove());
            return c.innerHTML.replace(/<br\s*\/?>\s*$/i, '').trim();
        },

        // ---- inline text editing ----
        beginEdit(el) {
            if (el.getAttribute('contenteditable') === 'true') return;
            // detach control bars while editing so they don't become editable content
            const stash = [...el.querySelectorAll(':scope > .foi-ctl')];
            stash.forEach(n => n.remove());
            el._origHTML = this.innerHTMLClean(el);
            el.setAttribute('contenteditable', 'true');
            el.focus();
            const r = document.createRange();
            r.selectNodeContents(el);
            const sel = window.getSelection();
            sel.removeAllRanges(); sel.addRange(r);

            const finish = (commit) => {
                el.removeEventListener('blur', onBlur);
                el.removeEventListener('keydown', onKey);
                el.removeAttribute('contenteditable');
                if (commit) this.commitText(el);
                else el.innerHTML = el._origHTML;   // cancel: revert DOM edits
                // rebuild controls (they were detached, and indices/labels may have changed)
                if (this.editing) this.decorate();
            };
            const onBlur = () => finish(true);
            const onKey = (ev) => {
                if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); el.blur(); }
                else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
            };
            el.addEventListener('blur', onBlur);
            el.addEventListener('keydown', onKey);
        },
        commitText(el) {
            const spec = el.getAttribute('data-edit');
            const { file, keys } = this.splitSpec(spec);
            const data = window.CMS.dataCache[file];
            if (!data) return;
            const newVal = this.innerHTMLClean(el);
            if (newVal === el._origHTML) return;   // nothing actually changed
            this.setAt(data, keys, newVal);
            this.markDirty(file);
        },

        // ---- array operations ----
        blankLike(sample) {
            if (Array.isArray(sample)) return [];
            if (sample && typeof sample === 'object') {
                const o = {};
                for (const k of Object.keys(sample)) o[k] = this.blankLike(sample[k]);
                return o;
            }
            if (typeof sample === 'boolean') return false;
            if (typeof sample === 'number') return 0;
            return 'New text';
        },
        addItem(spec) {
            const { file, keys } = this.splitSpec(spec);
            const data = window.CMS.dataCache[file];
            const arr = this.getAt(data, keys);
            if (!Array.isArray(arr)) return;
            if (arr.length === 0) {
                alert('This list is empty, so there is no template to copy.\nUse the /admin/ CMS to create the first item, then you can edit/duplicate here.');
                return;
            }
            const item = this.blankLike(arr[arr.length - 1]);
            arr.push(item);
            this.markDirty(file);
            this.rerender();
        },
        deleteItem(spec, i) {
            const { file, keys } = this.splitSpec(spec);
            const data = window.CMS.dataCache[file];
            const arr = this.getAt(data, keys);
            if (!Array.isArray(arr) || i < 0 || i >= arr.length) return;
            if (!confirm('Delete this item? You still have to press Save to publish.')) return;
            arr.splice(i, 1);
            this.markDirty(file);
            this.rerender();
        },
        moveItem(spec, i, dir) {
            const { file, keys } = this.splitSpec(spec);
            const data = window.CMS.dataCache[file];
            const arr = this.getAt(data, keys);
            const j = i + dir;
            if (!Array.isArray(arr) || j < 0 || j >= arr.length) return;
            const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
            this.markDirty(file);
            this.rerender();
        },

        // ---- GitHub OAuth (Netlify/Decap protocol) ----
        login(onDone) {
            const w = 600, h = 700;
            const left = window.screenX + (window.outerWidth - w) / 2;
            const top = window.screenY + (window.outerHeight - h) / 2;
            const url = OAUTH_BASE + '/auth?provider=github&scope=repo&site_id=' + encodeURIComponent(location.hostname);
            const popup = window.open(url, 'foi-oauth', `width=${w},height=${h},left=${left},top=${top}`);
            if (!popup) { alert('Popup blocked. Allow popups for this site and click Edit again.'); return; }

            const handler = (e) => {
                if (typeof e.data !== 'string') return;
                if (e.data.indexOf('authorizing:github') === 0) {
                    popup.postMessage('authorizing:github', e.origin);
                    return;
                }
                const ok = 'authorization:github:success:';
                const err = 'authorization:github:error:';
                if (e.data.indexOf(ok) === 0) {
                    window.removeEventListener('message', handler);
                    try { popup.close(); } catch (_) {}
                    let payload = {};
                    try { payload = JSON.parse(e.data.slice(ok.length)); } catch (_) {}
                    if (payload.token) {
                        this.token = payload.token;
                        localStorage.setItem(TOKEN_KEY, payload.token);
                        this.updateToolbar();
                        if (onDone) onDone();
                    } else { alert('Login failed: no token received.'); }
                } else if (e.data.indexOf(err) === 0) {
                    window.removeEventListener('message', handler);
                    try { popup.close(); } catch (_) {}
                    alert('GitHub login error: ' + e.data.slice(err.length));
                }
            };
            window.addEventListener('message', handler);
        },
        logout() {
            this.token = null;
            localStorage.removeItem(TOKEN_KEY);
            if (this.editing) this.disable();
            this.updateToolbar();
        },

        // ---- save (commit dirty JSON files) ----
        b64(str) { return btoa(unescape(encodeURIComponent(str))); },
        async ghGet(file) {
            const r = await fetch(`https://api.github.com/repos/${REPO}/contents/data/${file}?ref=${BRANCH}`, {
                headers: { Authorization: 'token ' + this.token, Accept: 'application/vnd.github+json' }
            });
            if (!r.ok) throw new Error(`GET ${file}: ${r.status}`);
            return r.json();
        },
        async ghPut(file, content, sha) {
            const r = await fetch(`https://api.github.com/repos/${REPO}/contents/data/${file}`, {
                method: 'PUT',
                headers: { Authorization: 'token ' + this.token, Accept: 'application/vnd.github+json' },
                body: JSON.stringify({
                    message: `Edit ${file} via inline editor`,
                    content: this.b64(content),
                    sha,
                    branch: BRANCH
                })
            });
            if (!r.ok) {
                const t = await r.text();
                throw new Error(`PUT ${file}: ${r.status} ${t.slice(0, 120)}`);
            }
            return r.json();
        },
        async save() {
            if (!this.token) { this.login(() => this.save()); return; }
            if (this.dirty.size === 0) { this.flash('Nothing to save.'); return; }
            const files = [...this.dirty];
            this.flash('Saving…', true);
            try {
                for (const file of files) {
                    const meta = await this.ghGet(file);
                    const content = JSON.stringify(window.CMS.dataCache[file], null, 2) + '\n';
                    await this.ghPut(file, content, meta.sha);
                    this.dirty.delete(file);
                    this.updateToolbar();
                }
                this.flash('✓ Saved! Live on the site in ~30–60s.', false, 6000);
            } catch (e) {
                console.error(e);
                if (String(e).includes('401') || String(e).includes('403')) {
                    this.flash('✗ Not authorised. Log in with a GitHub account that can write to the repo.', false, 8000);
                    this.logout();
                } else {
                    this.flash('✗ Save failed: ' + e.message, false, 9000);
                }
            }
        },

        // ---- toolbar / UI ----
        buildToolbar() {
            const bar = document.createElement('div');
            bar.id = 'foi-editor-bar';
            bar.innerHTML = `
                <button id="foi-toggle" type="button">✎ Edit</button>
                <button id="foi-save" type="button">Save</button>
                <span id="foi-status"></span>
                <button id="foi-logout" type="button" title="Log out">⏻</button>
            `;
            document.body.appendChild(bar);
            bar.querySelector('#foi-toggle').addEventListener('click', () => this.toggle());
            bar.querySelector('#foi-save').addEventListener('click', () => this.save());
            bar.querySelector('#foi-logout').addEventListener('click', () => this.logout());
            this.bar = bar;
        },
        updateToolbar() {
            if (!this.bar) return;
            const tg = this.bar.querySelector('#foi-toggle');
            const sv = this.bar.querySelector('#foi-save');
            const lo = this.bar.querySelector('#foi-logout');
            tg.textContent = this.editing ? '✓ Done' : '✎ Edit';
            tg.classList.toggle('active', this.editing);
            const n = this.dirty.size;
            sv.style.display = this.editing ? '' : 'none';
            sv.textContent = n ? `Save (${n})` : 'Save';
            sv.classList.toggle('has-changes', n > 0);
            lo.style.display = (this.editing && this.token) ? '' : 'none';
            if (!this.editing) this.bar.querySelector('#foi-status').textContent = '';
        },
        flash(msg, sticky, ms) {
            const s = this.bar.querySelector('#foi-status');
            s.textContent = msg;
            if (this._flashT) clearTimeout(this._flashT);
            if (!sticky) this._flashT = setTimeout(() => { s.textContent = ''; }, ms || 3000);
        },

        injectStyles() {
            const css = `
            #foi-editor-bar{position:fixed;right:16px;bottom:16px;z-index:99999;display:flex;align-items:center;gap:8px;
                background:#0f172a;color:#fff;padding:8px 10px;border-radius:999px;
                box-shadow:0 8px 30px rgba(0,0,0,.35);font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
            #foi-editor-bar button{cursor:pointer;border:0;border-radius:999px;padding:8px 14px;font:inherit;color:#0f172a;background:#fff;}
            #foi-editor-bar #foi-toggle.active{background:#22c55e;color:#062a14;}
            #foi-editor-bar #foi-save.has-changes{background:#f59e0b;color:#241400;}
            #foi-editor-bar #foi-logout{background:transparent;color:#fff;padding:6px 8px;font-size:16px;}
            #foi-editor-bar #foi-status{font-weight:500;font-size:13px;max-width:340px;}
            body.foi-editing [data-edit]{outline:1px dashed rgba(37,99,235,.45);outline-offset:2px;cursor:text;border-radius:3px;
                transition:background .12s,outline-color .12s;}
            body.foi-editing [data-edit]:hover{background:rgba(37,99,235,.10);outline-color:rgba(37,99,235,.9);}
            body.foi-editing [contenteditable="true"]{background:#fff7ed!important;outline:2px solid #f59e0b!important;}
            body.foi-editing [data-edit-index]{outline:1px dotted rgba(100,116,139,.35);}
            .foi-ctl{box-sizing:border-box;}
            .foi-item-ctl{position:absolute;top:4px;right:4px;display:flex;gap:3px;z-index:50;
                background:rgba(15,23,42,.92);padding:3px;border-radius:8px;}
            .foi-item-ctl button{cursor:pointer;border:0;background:#fff;color:#0f172a;border-radius:5px;width:24px;height:24px;
                font:700 13px/1 system-ui;display:flex;align-items:center;justify-content:center;padding:0;}
            .foi-item-ctl button[data-act="del"]{background:#ef4444;color:#fff;}
            .foi-add-btn{display:inline-flex;align-items:center;margin:14px auto 0;cursor:pointer;border:2px dashed #2563eb;
                background:rgba(37,99,235,.06);color:#2563eb;border-radius:10px;padding:10px 18px;font:700 14px/1 system-ui;}
            `;
            const st = document.createElement('style');
            st.textContent = css;
            document.head.appendChild(st);
        }
    };

    window.FOIEditor = FOIEditor;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => FOIEditor.init());
    } else {
        FOIEditor.init();
    }
})();
