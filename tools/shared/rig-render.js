// Shared cut-out rig renderer (bot + waist-up rider + equipment), used by the terrain prototype.
// Same drawing rules as tools/rig-preview (decisions #26, #39, #44). Units: the caller translates/rotates/flips to the bot's
// ground point and scales so that 1 unit = 1 display px at 1080p; this draws in rig units (concept px) via RD.artScale.
(function () {
  const ease = t => 1 - Math.pow(1 - Math.min(1, t), 3);
  const img = src => { const i = new Image(); i.src = src; return i; };
  const ok = i => i && i.complete && i.naturalWidth;
  const DEF = { legSwing: 24, bob: 4, sway: 2, idleBob: 1.5, recoil: 14, kick: 4, squash: 0.06, riderSize: 1 };

  function load(RD, AV) {
    const R = { RD, AV, parts: {}, bases: {}, items: { body: {}, head: {} } };
    for (const [k, f] of Object.entries(RD.parts)) R.parts[k] = img(RD.base + f);
    if (AV) {
      for (const [k, b] of Object.entries(AV.bases)) if (b.img) R.bases[k] = img(AV.base + b.img);
      for (const slot of ['body', 'head']) for (const [k, it] of Object.entries((AV.items || {})[slot] || {})) R.items[slot][k] = img(AV.itemsBase + it.img);
    }
    return R;
  }
  // Cannon art angle (decision #60): the bot's whole aim range maps PROPORTIONALLY onto the art's safe swing range,
  // so the cannon moves for every aim change and stops exactly at the aim limits (never desyncs). mode 'fixed' = no swing.
  let cannonMode = 'scaled', axisTrim = 0;
  const visualAim = (RD, aim) => {
    const L = RD.launcher, vMin = L.visualMin ?? 0, vMax = L.visualMax ?? 50, aMin = L.aimMin ?? 10, aMax = L.aimMax ?? 80;
    if (cannonMode === 'fixed') return L.aimBase ?? (vMin + vMax) / 2;
    if (cannonMode === 'true') return aim - (L.axisDeg || 0) - axisTrim;   // axisTrim: live fine-tune (prototype slider)                 // the barrel AXIS (rear -> mouth) points exactly at the aim (#63, #65)
    const t = Math.max(0, Math.min(1, (aim - aMin) / Math.max(1e-6, aMax - aMin)));
    return vMin + t * (vMax - vMin);
  };

  // st: { t, moving 0..1, phase, aim, recoilT, kickT }   rider: { base, head, body } or null
  function draw(c, R, st, opt, rider) {
    const o = Object.assign({}, DEF, opt || {}), RD = R.RD, A = RD.artScale;
    const walking = st.moving > 0.05, ph = st.phase;
    const bobWalk = walking ? (1 - Math.cos(2 * ph)) / 2 * o.bob * st.moving : 0;
    const bobIdle = Math.sin(st.t * 2.2) * o.idleBob * (1 - st.moving);
    const sway = walking ? Math.sin(ph) * o.sway * Math.PI / 180 * st.moving : 0;
    const kick = (1 - ease(st.kickT * 2.5)) * o.kick * Math.PI / 180;
    const sq = (walking ? Math.max(0, Math.cos(2 * ph)) * o.squash * st.moving : 0) + (1 - ease(st.recoilT * 3)) * o.squash;
    const P = (k, pivot) => { const i = R.parts[k]; if (ok(i)) c.drawImage(i, -pivot[0], -pivot[1]); };
    c.save(); c.scale(A, A);
    const bob = (bobWalk + bobIdle) / A, hipBob = bobWalk * 0.4 / A;
    const swing = o.legSwing * Math.PI / 180 * st.moving, legAng = p => walking ? Math.sin(ph + p) * swing : 0;
    const legs = RD.legs.map(l => ({ ...l, ph: l.img === 'leg_back' ? 0 : Math.PI })), fo = RD.farLegs ? RD.farLegs.offset : [0, 0];
    if (RD.farLegs) {
      c.save(); c.filter = `brightness(${RD.farLegs.darken})`;
      for (const l of legs) { c.save(); c.translate(l.at[0] + fo[0], l.at[1] + fo[1] - hipBob); c.rotate(legAng(l.ph + Math.PI)); P(l.img, l.pivot); c.restore(); }
      c.restore();
    }
    for (const l of legs) { c.save(); c.translate(l.at[0], l.at[1] - hipBob); c.rotate(legAng(l.ph)); P(l.img, l.pivot); c.restore(); }
    const [bx, by] = RD.body.at;
    c.save(); c.translate(bx, by - bob); c.rotate(-kick + sway); c.translate(-bx, -by);
    const L = RD.launcher;
    c.save(); c.translate(L.mount[0], L.mount[1]); c.rotate(-visualAim(RD, st.aim) * Math.PI / 180);
    c.translate(-(1 - ease(st.recoilT * 2)) * o.recoil / A, 0); P('launcher', L.pivot); c.restore();
    c.save(); c.translate(bx, by); c.scale(1 + sq, 1 - sq); P('body', RD.body.pivot); c.restore();
    if (RD.blink && ok(R.parts.blink)) {   // #76 blink: the closed-eye patch now and then (desynced per bot by st.blinkSeed)
      const per = RD.blink.every, ph = ((st.t + (st.blinkSeed || 0)) % per + per) % per;
      if (ph < RD.blink.dur) { c.save(); c.translate(...RD.blink.at); P('blink', RD.blink.pivot); c.restore(); }
    }
    if (RD.seed) {
      const [sx, sy] = RD.seed.at, r = RD.seed.r * (1.6 + 0.25 * Math.sin(st.t * 3));
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(sx, sy, 4, sx, sy, r);
      g.addColorStop(0, `rgba(255,200,80,${0.35 + 0.15 * Math.sin(st.t * 3)})`); g.addColorStop(1, 'rgba(255,160,40,0)');
      c.fillStyle = g; c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.fill(); c.restore();
    }
    const AV = R.AV;
    if (rider && AV && RD.rider && ok(R.bases[rider.base])) {
      c.save();
      if (RD.rider.clipY !== undefined) { c.beginPath(); c.rect(-1e5, -1e5, 2e5, 1e5 + RD.rider.clipY); c.clip(); }   // #70: cockpit depth
      c.translate(...RD.rider.seat);
      const k = RD.rider.height * o.riderSize / AV.seatedHeight; c.scale(k, k); c.rotate(Math.sin(st.t * 2.2) * 0.015);
      const cy = AV.clipY, an = AV.anchor;
      // composite base + equipment once per outfit (cached), then draw it with a bold runtime outline (#69)
      const key = [rider.base, rider.body, rider.head].join('|');
      R.riderCache = R.riderCache || {};
      let comp = R.riderCache[key];
      if (!comp) {
        const layers = [R.bases[rider.base], ...['body', 'head'].map(sl => R.items[sl][rider[sl]])].filter(ok);
        if (layers.length && layers.every(ok)) {
          comp = document.createElement('canvas'); comp.width = layers[0].naturalWidth; comp.height = cy;
          const x = comp.getContext('2d'); for (const im of layers) x.drawImage(im, 0, 0, im.naturalWidth, cy, 0, 0, im.naturalWidth, cy);
          R.riderCache[key] = comp;
        }
      }
      if (comp) {
        const ow = o.riderOutline ?? 1, col = o.riderOutlineColor || '#2b1a0e';
        if (ow > 0) c.filter = `drop-shadow(${ow}px 0 0 ${col}) drop-shadow(-${ow}px 0 0 ${col}) drop-shadow(0 ${ow}px 0 ${col}) drop-shadow(0 -${ow}px 0 ${col})`;
        c.drawImage(comp, -an[0], -an[1]); c.filter = 'none';
      }
      c.restore();
      if (RD.rider.front && ok(R.parts.rider_front)) { c.save(); c.translate(...RD.rider.front.at); P('rider_front', RD.rider.front.pivot); c.restore(); }
    }
    c.save(); c.translate(...RD.hub.at); c.scale(RD.hub.scale || 1, RD.hub.scale || 1); P('hub', RD.hub.pivot); c.restore();
    c.restore(); c.restore();
  }
  // muzzle position in display px (1080p units) relative to the ground point, before the caller's flip/tilt
  function muzzle(R, aim) {
    const RD = R.RD, A = RD.artScale, L = RD.launcher, a = -visualAim(RD, aim) * Math.PI / 180, [ux, uy] = L.muzzle;
    return [(L.mount[0] + ux * Math.cos(a) - uy * Math.sin(a)) * A, (L.mount[1] + ux * Math.sin(a) + uy * Math.cos(a)) * A];
  }
  window.KekRig = { load, draw, muzzle, visualAim, setCannonMode: m => { cannonMode = m; }, setAxisTrim: d => { axisTrim = d; } };
})();
