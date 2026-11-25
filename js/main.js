(function () {
  const raiz = document.documentElement;

  /* ---------- Tema claro/escuro com transição suave ---------- */
  const temaBtn = document.getElementById('temaBtn');
  const clipe = document.querySelector('.clipe');
  const metaCor = document.querySelector('meta[name="theme-color"]');
  let timerTema = 0;
  const atualizaBotao = () => temaBtn.setAttribute('aria-pressed', raiz.dataset.theme === 'dark');
  atualizaBotao();
  temaBtn.addEventListener('click', () => {
    const novo = raiz.dataset.theme === 'dark' ? 'light' : 'dark';
    clearTimeout(timerTema);
    raiz.classList.add('mudando-tema');     // liga as transições em toda a interface
    raiz.dataset.theme = novo;
    try { localStorage.setItem('tema', novo); } catch (e) {}
    if (metaCor) metaCor.setAttribute('content', novo === 'dark' ? '#000000' : '#e7e5df');
    atualizaBotao();
    if (clipe) {                            // o clipe some e volta enquanto troca o modo de mistura
      clipe.classList.add('oculto');
      setTimeout(() => { raiz.dataset.video = novo; clipe.classList.remove('oculto'); }, 300);
    } else {
      raiz.dataset.video = novo;
    }
    timerTema = setTimeout(() => raiz.classList.remove('mudando-tema'), 800);
  });

  /* ---------- Nome no topo: alterna Cravabala / Daniel Lima (e toca a tag) ---------- */
  const logo = document.getElementById('logo');
  const tag = document.getElementById('tag');
  let modoCrava = true;
  if (logo) {
    logo.addEventListener('click', () => {
      modoCrava = !modoCrava;
      logo.classList.add('troca');
      setTimeout(() => {
        logo.textContent = modoCrava ? 'Cravabala' : 'Daniel Lima';
        logo.classList.remove('troca');
      }, 160);
      if (!tag) return;
      if (modoCrava) {                      // voltou para Cravabala: toca a tag
        document.querySelectorAll('.beat audio').forEach(a => a.pause());
        tag.currentTime = 0;
        tag.play().catch(() => {});
      } else {
        tag.pause();
      }
    });
  }

  /* ---------- Letreiro com efeito de máquina de escrever ---------- */
  const letreiro = document.getElementById('letreiro');
  if (letreiro) {
    const linhas = Array.from(letreiro.querySelectorAll('.linha'));
    {
      const cursor = document.createElement('span');
      cursor.className = 'cursor digitando';
      cursor.setAttribute('aria-hidden', 'true');
      const dados = linhas.map(l => {
        const t = l.dataset.texto;
        l.textContent = '';
        const digitado = document.createElement('span');
        const falta = document.createElement('span');
        falta.className = 'falta';
        falta.textContent = t;      // texto invisível: mantém o espaço, sem o layout pular
        l.append(digitado, falta);
        l.classList.add('pronto');
        return { t, digitado, falta, l };
      });
      let li = 0, ci = 0;
      dados[0].l.insertBefore(cursor, dados[0].falta);
      const passo = () => {
        const d = dados[li];
        if (ci < d.t.length) {
          ci++;
          d.digitado.textContent = d.t.slice(0, ci);
          d.falta.textContent = d.t.slice(ci);
          setTimeout(passo, 35 + Math.random() * 45);
        } else if (li < dados.length - 1) {
          li++; ci = 0;
          dados[li].l.insertBefore(cursor, dados[li].falta);
          setTimeout(passo, 380);
        } else {
          cursor.classList.remove('digitando'); // cursor passa a piscar no fim
        }
      };
      setTimeout(passo, 450);
    }
  }

  /* ---------- Clipe de fundo: sempre toca (sem som, em loop) ---------- */
  const video = document.querySelector('.clipe video');
  if (video) {
    const tenta = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
    tenta();
    video.addEventListener('canplay', tenta, { once: true });
  }

  /* ---------- Players de beats ---------- */
  const fmt = (s) => { const t = Math.max(0, Math.floor(s || 0)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const beats = Array.from(document.querySelectorAll('.beat'));
  beats.forEach(beat => {
    const audio = beat.querySelector('audio');
    const btn = beat.querySelector('.play');
    const disco = beat.querySelector('.disco');
    const ondas = beat.querySelector('.ondas');
    const atual = beat.querySelector('.atual');
    const nome = beat.querySelector('h3').firstChild.textContent.trim();
    const picos = (window.PICOS && window.PICOS[beat.dataset.picos]) || new Array(64).fill(0.5);
    const durFixa = Number(beat.dataset.dur) || 60;
    const dur = () => (isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durFixa);

    const barras = picos.map((v, k) => {
      const s = document.createElement('span');
      s.style.setProperty('--r', (k / picos.length * 360).toFixed(2) + 'deg');
      s.style.setProperty('--h', (6 + Math.round(v * 38)) + 'px');
      ondas.appendChild(s);
      return s;
    });

    let raf = 0;
    const pinta = () => {
      const f = Math.min(1, audio.currentTime / dur());
      barras.forEach((b, k) => {
        const on = (k + 0.5) / barras.length <= f;
        if (on !== b._on) { b._on = on; b.classList.toggle('on', on); }
      });
      atual.textContent = fmt(audio.currentTime);
    };
    const loop = () => { pinta(); if (!audio.paused) raf = requestAnimationFrame(loop); };

    const estado = (tocando) => {
      beat.classList.toggle('tocando', tocando);
      btn.setAttribute('aria-pressed', tocando);
      btn.setAttribute('aria-label', (tocando ? 'Pausar ' : 'Tocar ') + nome);
    };

    audio.addEventListener('play', () => { estado(true); cancelAnimationFrame(raf); loop(); });
    audio.addEventListener('pause', () => { estado(false); cancelAnimationFrame(raf); pinta(); });
    audio.addEventListener('ended', () => { audio.currentTime = 0; estado(false); pinta(); });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      beats.forEach(o => { if (o !== beat) o.querySelector('audio').pause(); }); // só um toca por vez
      if (tag) tag.pause();
      if (audio.paused) audio.play().catch(() => {}); else audio.pause();
    });

    // Clicar no disco pula para aquele ponto (pelo ângulo, no sentido horário a partir do topo)
    disco.addEventListener('click', (e) => {
      const r = disco.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      let f = Math.atan2(dx, -dy) / (2 * Math.PI);
      if (f < 0) f += 1;
      const t = f * dur();
      if (audio.readyState < 1) {
        audio.addEventListener('loadedmetadata', () => { audio.currentTime = t; pinta(); }, { once: true });
        audio.load();
      } else {
        audio.currentTime = t;
        pinta();
      }
    });
  });

  /* ---------- Ano no rodapé ---------- */
  document.getElementById('ano').textContent = new Date().getFullYear();
})();
