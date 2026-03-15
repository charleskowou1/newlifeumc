// ===============================
// Mobile Nav Toggle
// ===============================
const btn = document.getElementById("menuToggle");
const links = document.getElementById("navLinks");

btn?.addEventListener("click", () => {
 const open = links.classList.toggle("is-open");
 btn.setAttribute("aria-expanded", String(open));
});

// ===============================
// LIVE NOW (Sundays @ 11AM ET)
// - Swaps "Plan Your Visit" button into "LIVE NOW" during service window
// - Adds a red dot inside the button when live
// - Test with:
//   index.html?forceLive=1
//   index.html?mockTime=2026-02-22T11:05:00-05:00
// ===============================
(function setupLiveNow() {
 const LIVE = {
  timeZone: "America/New_York",
  startHour: 11,
  startMinute: 0,
  endHour: 12,
  endMinute: 30,
  liveUrl: "https://www.facebook.com/newlifeumcdrexelhillpa/",
 };

 const params = new URLSearchParams(window.location.search);
 const forceLive = params.get("forceLive") === "1";
 const mockTimeStr = params.get("mockTime"); // ISO string with timezone recommended

 function getTimePartsInTZ(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
   timeZone,
   weekday: "short",
   hour: "2-digit",
   minute: "2-digit",
   hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return {
   weekday: map.weekday, // "Sun"
   hour: Number(map.hour),
   minute: Number(map.minute),
  };
 }

 function toMinutes(h, m) {
  return h * 60 + m;
 }

 function isLiveWindow() {
  if (forceLive) return true;

  const now = mockTimeStr ? new Date(mockTimeStr) : new Date();
  const ny = getTimePartsInTZ(now, LIVE.timeZone);

  const isSunday = ny.weekday === "Sun";
  const minutes = toMinutes(ny.hour, ny.minute);

  const start = toMinutes(LIVE.startHour, LIVE.startMinute);
  const end = toMinutes(LIVE.endHour, LIVE.endMinute);

  return isSunday && minutes >= start && minutes <= end;
 }

 function applyLiveState() {
  const liveBtn = document.getElementById("liveNowBtn");
  const visitBtn = document.getElementById("planVisitBtn");
  if (!liveBtn || !visitBtn) return;

  const live = isLiveWindow();
  liveBtn.style.display = live ? "" : "none";
  visitBtn.style.display = live ? "none" : "";
 }

 document.addEventListener("DOMContentLoaded", () => {
  applyLiveState();
  // update every 30 seconds so it flips automatically if someone loads at 10:59
  const _liveTimer = setInterval(applyLiveState, 30 * 1000);
 });
})();

// ===============================
// Hero Slider (Women/Men photos)
// ===============================
(function setupHeroSlider() {
 const hero = document.getElementById("heroSlider");
 if (!hero) return;

 const prevBtn = document.getElementById("heroPrev");
 const nextBtn = document.getElementById("heroNext");
 const dots = document.querySelectorAll(".hero__dot");

 const slides = [
  'url("assets/banners/womenumc.jpg")',
  'url("assets/banners/menumc.jpg")',
  'url("assets/banners/youngadults.jpg")'
 ];

 let index = 0;
 let timer = null;
 const INTERVAL_MS = 8000;

 function setDots() {
  dots.forEach(d => d.classList.remove("active"));
  dots[index]?.classList.add("active");
 }

 function setSlide(i) {
  index = (i + slides.length) % slides.length;
  hero.style.setProperty("--hero-img", slides[index]);
  setDots();
 }

 function stopAuto() {
  clearInterval(timer);
  timer = null;
 }

 function startAuto() {
  stopAuto();
  timer = setInterval(() => setSlide(index + 1), INTERVAL_MS);
 }

 prevBtn?.addEventListener("click", () => { setSlide(index - 1); startAuto(); });
 nextBtn?.addEventListener("click", () => { setSlide(index + 1); startAuto(); });

 dots.forEach(dot => {
  dot.addEventListener("click", () => {
   setSlide(parseInt(dot.dataset.slide, 10));
   startAuto();
  });
 });

 hero.addEventListener("mouseenter", stopAuto);
 hero.addEventListener("mouseleave", startAuto);

 setSlide(0);
 startAuto();
})();