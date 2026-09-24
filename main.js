const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

// ---------- Works without Motion ----------

// Nav indicator slides under the section in view.
const links = $$('.nav-pill a');
const indicator = $('.nav-indicator');
const sections = links.map(a => $(a.hash));
function setActive(link) {
    links.forEach(a => a.classList.toggle('active', a === link));
    indicator.style.opacity = link ? 1 : 0;
    if (!link) return;
    indicator.style.width = link.offsetWidth + 'px';
    indicator.style.transform = `translateX(${link.offsetLeft - 5}px)`;
}
const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) setActive(links[sections.indexOf(e.target)]);
    else if (e.target === sections[0] && e.boundingClientRect.top > 0) setActive(null); // back in hero
}), { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => io.observe(s));

// Copy email.
$$('.email-copy').forEach(btn => btn.addEventListener('click', async () => {
    const hint = $('.email-hint', btn);
    try { await navigator.clipboard.writeText(btn.dataset.email); hint.textContent = 'copied ✓'; }
    catch { location.href = 'mailto:' + btn.dataset.email; }
    setTimeout(() => hint.textContent = 'click to copy', 2000);
}));

// Cursor-follow spotlight on cards + hero.
if (fine) {
    $$('.glow').forEach(el => el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--x', e.clientX - r.left + 'px');
        el.style.setProperty('--y', e.clientY - r.top + 'px');
    }));
    const hero = $('.hero');
    hero.addEventListener('pointermove', e => {
        hero.style.setProperty('--mx', e.clientX + 'px');
        hero.style.setProperty('--my', e.clientY + 'px');
    });
}

// Split text into word spans, keeping <em> styling per word.
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function split(el, cls) {
    const out = [];
    el.childNodes.forEach(n => n.textContent.trim().split(/\s+/).filter(Boolean).forEach(w =>
        out.push(n.nodeType === 3 ? `<span class="${cls}">${esc(w)}</span>`
            : `<span class="${cls}"><${n.localName}>${esc(w)}</${n.localName}></span>`)));
    el.innerHTML = out.join(' ');
}

// ---------- Motion (progressive enhancement; page stays fully visible if the CDN fails) ----------
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    try {
        const { animate, inView, scroll, stagger } = await import('https://cdn.jsdelivr.net/npm/motion@12/+esm');
        split($('h1'), 'w');
        split($('.footer-title'), 'w');
        $$('.scrub').forEach(h => split(h, 'sw'));
        document.documentElement.classList.add('motion');
        const spring = { type: 'spring', stiffness: 110, damping: 18 };

        // Hero headline: blur-in word by word.
        animate('h1 .w', { opacity: [0, 1], y: [60, 0], filter: ['blur(14px)', 'blur(0px)'], rotate: [4, 0] },
            { ...spring, delay: stagger(0.09, { startDelay: 0.15 }) });

        // Generic reveals.
        inView('.reveal', el => { animate(el, { opacity: [0, 1], y: [36, 0] }, { ...spring, delay: 0.05 }); },
            { margin: '0px 0px -8% 0px' });

        // Rotating role line.
        const words = $$('.rot-word');
        words.forEach((w, i) => i && animate(w, { opacity: 0, y: '100%' }, { duration: 0 }));
        let cur = 0;
        setInterval(() => {
            const next = (cur + 1) % words.length;
            animate(words[cur], { opacity: 0, y: '-100%' }, { duration: 0.45, ease: [0.6, 0, 0.3, 1] });
            animate(words[next], { opacity: [0, 1], y: ['100%', '0%'] }, { duration: 0.55, ease: [0.2, 0.9, 0.3, 1] });
            cur = next;
        }, 2400);

        // Counters.
        inView('[data-count]', el => {
            const end = parseFloat(el.dataset.count), d = +el.dataset.decimals || 0;
            animate(0, end, { duration: 1.8, ease: [0.16, 1, 0.3, 1],
                onUpdate: v => el.textContent = v.toFixed(d), onComplete: () => el.textContent = el.dataset.count });
        });

        // Bento tiles pop in with a stagger.
        inView('.bento', el => { animate($$('.tile', el), { opacity: [0, 1], scale: [0.9, 1], y: [30, 0] }, { ...spring, delay: stagger(0.08) }); });

        // Headlines light up word by word as you scroll.
        $$('.scrub').forEach(h => {
            const ws = $$('.sw', h);
            scroll(p => ws.forEach((w, i) => w.style.opacity = Math.min(1, Math.max(0.15, p * ws.length * 1.3 - i))),
                { target: h, offset: ['start 85%', 'end 45%'] });
        });

        // Scroll progress + hero parallax.
        scroll(animate('.progress', { scaleX: [0, 1] }, { ease: 'linear' }));
        scroll(animate('.hero-photo', { y: [0, 120], rotate: [0, -3] }, { ease: 'linear' }),
            { target: $('.hero'), offset: ['start start', 'end start'] });

        // Timeline line draws itself.
        scroll(animate('.timeline-line', { scaleY: [0, 1] }, { ease: 'linear' }),
            { target: $('.timeline'), offset: ['start 75%', 'end 55%'] });

        // Publications: pinned horizontal scroll.
        const hs = $('.hscroll'), track = $('.hscroll-track');
        let dist = 0;
        const measure = () => {
            const last = track.lastElementChild, first = track.firstElementChild;
            dist = Math.max(0, last.offsetLeft + last.offsetWidth + first.offsetLeft - innerWidth);
            hs.style.height = innerHeight + dist + 'px'; // only as much scroll as the cards need
        };
        measure(); addEventListener('resize', measure);
        scroll(p => track.style.transform = `translateX(${-p * dist}px)`, { target: hs, offset: ['start start', 'end end'] });

        // Honors chips spring in.
        inView('.chips', el => { animate([...el.children], { opacity: [0, 1], y: [24, 0], scale: [0.7, 1] }, { ...spring, delay: stagger(0.05) }); });

        // Footer headline.
        inView('.footer-title', () => {
            animate('.footer-title .w', { opacity: [0, 1], y: [50, 0], filter: ['blur(10px)', 'blur(0px)'] }, { ...spring, delay: stagger(0.07) });
        });

        if (fine) {
            // Magnetic buttons.
            $$('.magnetic').forEach(el => {
                el.addEventListener('pointermove', e => {
                    const r = el.getBoundingClientRect();
                    animate(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4 }, { type: 'spring', stiffness: 300, damping: 20 });
                });
                el.addEventListener('pointerleave', () => animate(el, { x: 0, y: 0 }, { type: 'spring', stiffness: 200, damping: 12 }));
            });
        }
    } catch (e) {
        console.error(e);
        document.documentElement.classList.remove('motion');
    }
}
