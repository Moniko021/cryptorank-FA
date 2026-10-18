// === crypto4youFA - Hardened & Bug-Free Core (Part 1) ===
let coins = [];
let showFullCoins = false;
let currentPage = 'home';
let wheelDeg = 0;
let isSpinning = false;
let busyTasks = {};
let cloudDrops = [];
let cloudTasks = [];
let logoTapCount = 0;
let logoTapTimer = null;

function safeJsonParse(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) { return fallback; }
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeUrl(u) {
  var s = String(u || '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  return '#';
}

let currentUser = safeJsonParse('cr_active_user', null);
let savedGoogleAccount = safeJsonParse('cr_saved_google_user', null);
let savedDrops = safeJsonParse('cr_user_saved_drops', []);

const CR_EMAILJS_KEY = '8ajZprWhO5Ui9IvfD';
const CR_EMAILJS_SERVICE = 'service_wgdnhlj';
const CR_EMAILJS_TEMPLATE = 'template_f4xspnv';
let crGeneratedOTP = null;
let crPendingUser = null;
let crUserUnsub = null;

const CR_WHEEL_ITEMS = [
  { idx: 0, short: '۱ میلیون',  label: '۱ میلیون تومان', amount: 1000000, weight: 0.1 },
  { idx: 1, short: '۸۰۰ هزار',  label: '۸۰۰ هزار تومان', amount: 800000,  weight: 0.1 },
  { idx: 2, short: '۵۰۰ هزار',  label: '۵۰۰ هزار تومان', amount: 500000,  weight: 0.1 },
  { idx: 3, short: '🎁',        label: '🎁 جایزه ویژه (۵۰ هزار تومان)', amount: 50000, weight: 0.5 },
  { idx: 4, short: 'پوچ ❌',    label: 'پوچ',            amount: 0,       weight: 90.0 },
  { idx: 5, short: '۱۰۰ هزار',  label: '۱۰۰ هزار تومان', amount: 100000,  weight: 30.0 },
  { idx: 6, short: '۵۰ هزار',   label: '۵۰ هزار تومان',  amount: 50000,   weight: 50.0 },
  { idx: 7, short: '۱۰ هزار',   label: '۱۰ هزار تومان',  amount: 10000,   weight: 90.0 }
];

function handleSecretAdminTap() {
  logoTapCount++;
  if (logoTapTimer) clearTimeout(logoTapTimer);
  if (logoTapCount >= 5) {
    logoTapCount = 0;
    window.location.href = 'admin.html';
    return;
  }
  logoTapTimer = setTimeout(function() { logoTapCount = 0; }, 1800);
}

function getDocKey(e) { return String(e || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_'); }
function getSpinKey() { return (currentUser && currentUser.type === 'google' && currentUser.email) ? 'cr_spin_' + getDocKey(currentUser.email) : 'cr_spin_guest'; }
function getVaultKey(e) { return 'cr_vault_' + getDocKey(e); }

function calcSig(email, bal) {
  var str = String(email || '').toLowerCase() + '::' + Number(bal || 0) + '::c4y_salt_99';
  var h = 0;
  for (var i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return 's_' + Math.abs(h);
}

setTimeout(function() {
  var sp = document.getElementById('cr-splash');
  if (sp) { sp.style.opacity = '0'; setTimeout(function() { sp.style.display = 'none'; }, 500); }
}, 2000);

function saveToLocalVault() {
  if (currentUser && currentUser.type === 'google' && currentUser.email) {
    var cleanMail = currentUser.email.trim().toLowerCase();
    var bal = Number(currentUser.balanceToman) || 0;
    currentUser.sig = calcSig(cleanMail, bal);
    var data = {
      name: currentUser.name, email: cleanMail, balanceToman: bal, sig: currentUser.sig,
      prizesList: Array.isArray(currentUser.prizesList) ? currentUser.prizesList : [],
      completedTasks: Array.isArray(currentUser.completedTasks) ? currentUser.completedTasks : [],
      solWallet: currentUser.solWallet || '', ethWallet: currentUser.ethWallet || '',
      savedDrops: savedDrops || [], lastSpin: currentUser.lastSpin || localStorage.getItem(getSpinKey()) || null
    };
    localStorage.setItem(getVaultKey(cleanMail), JSON.stringify(data));
    localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
    localStorage.setItem('cr_saved_google_user', JSON.stringify(currentUser));
  }
}

function syncUserToCloud() {
  if (currentUser && currentUser.type === 'google' && currentUser.email) {
    saveToLocalVault();
    if (typeof db !== 'undefined') {
      db.collection("users").doc(getDocKey(currentUser.email)).set({
        name: currentUser.name, email: currentUser.email.trim().toLowerCase(),
        balanceToman: Number(currentUser.balanceToman) || 0, sig: currentUser.sig,
        prizesList: Array.isArray(currentUser.prizesList) ? currentUser.prizesList : [],
        completedTasks: Array.isArray(currentUser.completedTasks) ? currentUser.completedTasks : [],
        solWallet: currentUser.solWallet || '', ethWallet: currentUser.ethWallet || '',
        savedDrops: savedDrops || [], lastSpin: currentUser.lastSpin || localStorage.getItem(getSpinKey()) || null,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(function(){});
    }
  }
}

function loadUserFromCloud(email) {
  if (typeof db === 'undefined' || !email) return;
  var k = getDocKey(email);
  if (crUserUnsub) { crUserUnsub(); crUserUnsub = null; }
  crUserUnsub = db.collection("users").doc(k).onSnapshot(function(doc) {
    if (doc.exists && currentUser && currentUser.type === 'google') {
      var d = doc.data();
      if (d.balanceToman !== undefined) currentUser.balanceToman = Number(d.balanceToman) || 0;
      if (Array.isArray(d.prizesList)) currentUser.prizesList = d.prizesList;
      if (Array.isArray(d.completedTasks)) currentUser.completedTasks = d.completedTasks;
      if (d.solWallet !== undefined) currentUser.solWallet = d.solWallet;
      if (d.ethWallet !== undefined) currentUser.ethWallet = d.ethWallet;
      if (Array.isArray(d.savedDrops)) { savedDrops = d.savedDrops; localStorage.setItem('cr_user_saved_drops', JSON.stringify(savedDrops)); }
      if (d.lastSpin) { currentUser.lastSpin = String(d.lastSpin); localStorage.setItem(getSpinKey(), String(d.lastSpin)); }
      saveToLocalVault(); updateUserHeader(); renderProfilePage();
    }
  }, function(){});
}

function updateSavedGoogleButtonUI() {
  var savedBtn = document.getElementById('saved-google-btn'), savedTxt = document.getElementById('saved-google-txt');
  if (savedBtn && savedTxt) {
    if (savedGoogleAccount && savedGoogleAccount.email) {
      savedBtn.style.display = 'flex';
      savedTxt.innerText = 'ادامه با ' + savedGoogleAccount.name + ' (' + savedGoogleAccount.email + ')';
    } else { savedBtn.style.display = 'none'; }
  }
}

function initAuth() {
  updateSavedGoogleButtonUI();
  if (currentUser && currentUser.type === 'google' && currentUser.email) {
    var vd = safeJsonParse(getVaultKey(currentUser.email), null);
    if (vd && vd.sig === calcSig(currentUser.email, vd.balanceToman)) {
      currentUser.balanceToman = Number(vd.balanceToman) || 0;
      if (Array.isArray(vd.prizesList)) currentUser.prizesList = vd.prizesList;
      if (Array.isArray(vd.completedTasks)) currentUser.completedTasks = vd.completedTasks;
      if (vd.solWallet) currentUser.solWallet = vd.solWallet;
      if (vd.ethWallet) currentUser.ethWallet = vd.ethWallet;
    } else { currentUser.balanceToman = 0; }
    updateUserHeader(); loadUserFromCloud(currentUser.email); return;
  }
  var authModal = document.getElementById('auth-modal');
  if (authModal && !currentUser) authModal.classList.add('show');
  updateUserHeader();
}

function closeAuthModal() {
  if (!currentUser) loginAnonymously();
  else document.getElementById('auth-modal').classList.remove('show');
}

function quickGoogleLogin() {
  if (!savedGoogleAccount || !savedGoogleAccount.email) return showGoogleForm();
  currentUser = Object.assign({}, savedGoogleAccount);
  savedDrops = safeJsonParse(getVaultKey(currentUser.email), {}).savedDrops || [];
  localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
  localStorage.setItem('cr_user_saved_drops', JSON.stringify(savedDrops));
  document.getElementById('auth-modal').classList.remove('show');
  initAuth(); renderLists(); renderProfilePage();
}

function showGoogleForm() {
  document.getElementById('auth-main-btns').style.display = 'none';
  document.getElementById('google-form').style.display = 'block';
  if (savedGoogleAccount) {
    var gn = document.getElementById('g-name'), ge = document.getElementById('g-email');
    if (gn) gn.value = savedGoogleAccount.name || '';
    if (ge) ge.value = savedGoogleAccount.email || '';
  }
}

function hideGoogleForm() {
  document.getElementById('google-form').style.display = 'none';
  document.getElementById('auth-main-btns').style.display = 'block';
  updateSavedGoogleButtonUI();
}

function resetOtpStep() {
  document.getElementById('otp-step-1').style.display = 'block';
  document.getElementById('otp-step-2').style.display = 'none';
  document.getElementById('g-otp-code').value = '';
}

async function sendVerificationCode() {
  var name = document.getElementById('g-name').value.trim();
  var email = document.getElementById('g-email').value.trim().toLowerCase();
  if (!name || !email || !email.includes('@')) return alert('لطفاً نام و آدرس جیمیل معتبر وارد کنید.');
  var lastOtp = Number(sessionStorage.getItem('cr_otp_ts') || 0);
  if (Date.now() - lastOtp < 30000) return alert('⏳ لطفاً ۳۰ ثانیه صبر کنید.');

  crGeneratedOTP = Math.floor(100000 + Math.random() * 900000).toString();
  crPendingUser = { name: name, email: email };
  var btn = document.getElementById('send-otp-btn');
  btn.innerText = '⏳ در حال ارسال...'; btn.disabled = true;
  try {
    emailjs.init(CR_EMAILJS_KEY);
    await emailjs.send(CR_EMAILJS_SERVICE, CR_EMAILJS_TEMPLATE, {
      to_name: name, name: name, from_name: 'crypto4youFA', to_email: email, email: email,
      otp_code: crGeneratedOTP, code: crGeneratedOTP, title: 'کد تایید: ' + crGeneratedOTP,
      message: 'کد تایید ورود شما به crypto4youFA: ' + crGeneratedOTP
    });
    sessionStorage.setItem('cr_otp_ts', String(Date.now()));
    document.getElementById('otp-step-1').style.display = 'none';
    document.getElementById('otp-step-2').style.display = 'block';
    document.getElementById('otp-email-preview').innerText = email;
  } catch (err) { alert('خطا در ارسال ایمیل.'); }
  finally { btn.innerText = '📨 ارسال کد تایید به جیمیل'; btn.disabled = false; }
}

async function verifyAndLogin() {
  if (!crPendingUser || !crPendingUser.email) return resetOtpStep();
  var code = document.getElementById('g-otp-code').value.trim();
  if (!crGeneratedOTP || code !== crGeneratedOTP) return alert('❌ کد وارد شده اشتباه است!');
  crGeneratedOTP = null;
  var cleanEmail = crPendingUser.email.trim().toLowerCase();
  var k = getDocKey(cleanEmail), vKey = getVaultKey(cleanEmail);
  var bal = 0, pList = [], cTasks = [], solW = '', ethW = '', drops = [], lSpin = localStorage.getItem('cr_spin_' + k) || null;

  var vd = safeJsonParse(vKey, null);
  if (vd && vd.sig === calcSig(cleanEmail, vd.balanceToman)) {
    bal = Number(vd.balanceToman) || 0;
    if (Array.isArray(vd.prizesList)) pList = vd.prizesList;
    if (Array.isArray(vd.completedTasks)) cTasks = vd.completedTasks;
    solW = vd.solWallet || ''; ethW = vd.ethWallet || '';
    if (Array.isArray(vd.savedDrops)) drops = vd.savedDrops;
    if (vd.lastSpin) lSpin = String(vd.lastSpin);
  }

  if (typeof db !== 'undefined') {
    try {
      var doc = await db.collection("users").doc(k).get();
      if (doc.exists) {
        var d = doc.data();
        bal = Number(d.balanceToman) || 0;
        if (Array.isArray(d.prizesList)) pList = d.prizesList;
        if (Array.isArray(d.completedTasks)) cTasks = d.completedTasks;
        if (d.solWallet) solW = d.solWallet;
        if (d.ethWallet) ethW = d.ethWallet;
        if (Array.isArray(d.savedDrops)) drops = d.savedDrops;
        if (d.lastSpin) lSpin = String(d.lastSpin);
      }
    } catch(err) {}
  }

  currentUser = { type: 'google', name: crPendingUser.name, email: cleanEmail, balanceToman: bal, prizesList: pList, completedTasks: cTasks, solWallet: solW, ethWallet: ethW, lastSpin: lSpin };
  savedGoogleAccount = Object.assign({}, currentUser);
  savedDrops = drops;
  localStorage.setItem('cr_user_saved_drops', JSON.stringify(savedDrops));
  if (lSpin) localStorage.setItem(getSpinKey(), lSpin);
  saveToLocalVault(); syncUserToCloud(); loadUserFromCloud(cleanEmail);
  document.getElementById('auth-modal').classList.remove('show');
  updateUserHeader(); renderLists(); renderProfilePage();
}

function loginAnonymously() {
  if (crUserUnsub) { crUserUnsub(); crUserUnsub = null; }
  currentUser = { type: 'anon', name: 'کاربر ناشناس', email: 'بدون ایمیل (حالت مهمان)', balanceToman: 0 };
  savedDrops = [];
  localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
  localStorage.setItem('cr_user_saved_drops', '[]');
  document.getElementById('auth-modal').classList.remove('show');
  updateUserHeader(); renderLists();
}

function switchAccount() {
  closeModal();
  if (crUserUnsub) { crUserUnsub(); crUserUnsub = null; }
  localStorage.removeItem('cr_active_user');
  currentUser = null; savedDrops = [];
  localStorage.setItem('cr_user_saved_drops', '[]');
  hideGoogleForm(); resetOtpStep(); updateSavedGoogleButtonUI(); updateUserHeader();
  document.getElementById('auth-modal').classList.add('show');
}

function updateUserHeader() {
  var avatarEl = document.getElementById('header-user-avatar'), nameEl = document.getElementById('header-user-name');
  if (!avatarEl || !nameEl) return;
  if (currentUser && currentUser.type === 'google') {
    avatarEl.innerText = currentUser.name.charAt(0).toUpperCase();
    avatarEl.style.background = '#10b981'; nameEl.innerText = currentUser.name;
  } else {
    avatarEl.innerText = '🕶️'; avatarEl.style.background = '#3b82f6'; nameEl.innerText = 'ناشناس';
  }
  renderUserTasksBox();
}

function openPage(p) {
  currentPage = p;
  ['home','news','drops','vcs','unlocks','converter','profile'].forEach(function(x) {
    var pg = document.getElementById('page-' + x), st = document.getElementById('st-' + x);
    if (pg) pg.classList.remove('active');
    if (st) st.classList.remove('active');
  });
  var targetPg = document.getElementById('page-' + p), activeSt = document.getElementById('st-' + p);
  if (targetPg) targetPg.classList.add('active');
  if (activeSt) activeSt.classList.add('active');
  if (p === 'profile') renderProfilePage();
  window.scrollTo(0, 0);
}

function openProfileModal() { openPage('profile'); }
function closeModal() { document.getElementById('modal').classList.remove('show'); }

function setupWheelAndTasksDOM() {
  var wheelSec = document.querySelector('.wheel-section');
  if (!wheelSec || document.getElementById('wheel-8-done')) return;
  var degs = [-67.5, -22.5, 22.5, 67.5, 112.5, 157.5, 202.5, 247.5];
  var cols = ['#000', '#fff', '#fff', '#fff', '#cbd5e1', '#fff', '#fff', '#000'];
  var slices = '';
  for (var i = 0; i < 8; i++) {
    var fSize = (i === 3) ? '18px' : '11px';
    slices += '<div style="position:absolute;top:50%;left:50%;width:122px;height:24px;margin-top:-12px;transform-origin:0 50%;transform:rotate(' + degs[i] + 'deg);text-align:right;padding-right:12px;font-size:' + fSize + ';font-weight:900;color:' + cols[i] + ';direction:ltr;line-height:24px;">' + CR_WHEEL_ITEMS[i].short + '</div>';
  }
  wheelSec.innerHTML =
    '<div id="wheel-8-done" style="font-size:17px;font-weight:900;color:#fff;">🎡 گردونه میلیونی روزانه</div>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:4px;">هر ۲۴ ساعت یک‌بار گردونه را بچرخانید و جایزه ببرید!</div>' +
    '<div style="width:260px;height:260px;margin:18px auto;position:relative;">' +
      '<div style="position:absolute;top:-18px;left:0;right:0;text-align:center;font-size:28px;z-index:25;">🔻</div>' +
      '<div id="wheel-el" style="width:100%;height:100%;border-radius:50%;position:relative;overflow:hidden;border:5px solid #2a324b;box-shadow:0 0 25px rgba(59,130,246,0.35);transition:transform 4s cubic-bezier(0.15, 0.85, 0.15, 1);background:conic-gradient(#eab308 0deg 45deg, #8b5cf6 45deg 90deg, #ec4899 90deg 135deg, #f97316 135deg 180deg, #334155 180deg 225deg, #10b981 225deg 270deg, #3b82f6 270deg 315deg, #06b6d4 315deg 360deg);">' +
        slices +
        '<div style="position:absolute;inset:0;margin:auto;width:46px;height:46px;background:#131722;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;z-index:10;">🎯</div>' +
      '</div>' +
    '</div>' +
    '<button id="wheel-spin-btn" class="spin-btn" onclick="spinWheel()">🎯 چرخاندن گردونه شانس</button>' +
    '<div style="font-size:11px;color:#94a3b8;text-align:center;margin-top:12px;line-height:1.8;background:#0b0e14;padding:10px 12px;border-radius:12px;border:1px solid #1e2433;">' +
      'جوایز در حساب کاربری ذخیره میشه هر جمعه به حساب کاربر ها واریز میشه جوایز میتونه نقدی یا به صورت ارز دیجیتال واریز بشه' +
    '</div>' +
    '<div id="user-cash-tasks-box" style="margin-top:16px;background:#131722;border:1px solid #22293a;border-radius:18px;padding:16px;text-align:right;"></div>';
  renderUserTasksBox();
}

function spinWheel() {
  if (isSpinning) return;
  if (!currentUser || currentUser.type !== 'google') {
    alert('⚠️ برای چرخاندن گردونه و ذخیره جوایز، ابتدا با جیمیل خود وارد شوید.');
    document.getElementById('auth-modal').classList.add('show');
    return;
  }
  var sk = getSpinKey(), last = currentUser.lastSpin || localStorage.getItem(sk), now = Date.now();
  if (last && (now - parseInt(last)) < 86400000) {
    var h = Math.ceil((86400000 - (now - parseInt(last))) / 3600000);
    return alert('⏳ هر اکانت فقط هر ۲۴ ساعت یک‌بار می‌تواند گردونه را بچرخاند! ' + h + ' ساعت دیگر امتحان کنید.');
  }
  isSpinning = true;
  var spinBtn = document.getElementById('wheel-spin-btn');
  if (spinBtn) spinBtn.disabled = true;

  var st = now.toString();
  localStorage.setItem(sk, st); currentUser.lastSpin = st;

  var totalW = 0;
  for (var i = 0; i < CR_WHEEL_ITEMS.length; i++) totalW += CR_WHEEL_ITEMS[i].weight;
  var rnd = Math.random() * totalW, chosen = CR_WHEEL_ITEMS[4], sumW = 0;
  for (var j = 0; j < CR_WHEEL_ITEMS.length; j++) {
    sumW += CR_WHEEL_ITEMS[j].weight;
    if (rnd <= sumW) { chosen = CR_WHEEL_ITEMS[j]; break; }
  }
  var sliceCenter = chosen.idx * 45 + 22.5;
  var targetMod = (360 - sliceCenter) % 360;
  var diff = targetMod - (wheelDeg % 360);
  if (diff < 0) diff += 360;
  wheelDeg += 1800 + diff;
  var wEl = document.getElementById('wheel-el');
  if (wEl) wEl.style.transform = 'rotate(' + wheelDeg + 'deg)';

  setTimeout(function() {
    isSpinning = false;
    if (spinBtn) spinBtn.disabled = false;
    if (!Array.isArray(currentUser.prizesList)) currentUser.prizesList = [];
    if (chosen.amount > 0) {
      currentUser.balanceToman = (Number(currentUser.balanceToman) || 0) + chosen.amount;
      currentUser.prizesList.unshift({ title: chosen.label, amount: chosen.amount, date: new Date().toLocaleDateString('fa-IR') });
      alert('🎉 تبریک ' + currentUser.name + '! شما برنده «' + chosen.label + '» شدید! در حساب کاربری ذخیره شد.');
    } else {
      alert('😕 نتیجه گردونه: «پوچ»! فردا دوباره شانس خود را امتحان کنید.');
    }
    syncUserToCloud(); updateUserHeader(); renderProfilePage();
  }, 4100);
}

// === crypto4youFA - Core (Part 2A) ===
function renderUserTasksBox() {
  var box = document.getElementById('user-cash-tasks-box');
  if (!box) return;
  if (!currentUser || currentUser.type !== 'google') {
    box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><div style="font-size:15px;font-weight:900;color:#fff;">🎯 تسک‌های پاداش نقدی</div><span class="badge" style="color:#eab308;">ویژه اعضا</span></div><div style="font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:12px;">با انجام تسک‌های روزانه، پاداش نقدی مستقیم در حساب خود دریافت کنید. ابتدا با جیمیل وارد شوید.</div><button onclick="switchAccount()" class="spin-btn" style="width:100%;padding:10px;font-size:12px;">📧 ورود با جیمیل و فعال‌سازی تسک‌ها</button>';
    return;
  }
  var doneList = Array.isArray(currentUser.completedTasks) ? currentUser.completedTasks : [];
  var tasksHtml = '';
  if (!cloudTasks || cloudTasks.length === 0) {
    tasksHtml = '<div style="background:#0b0e14;border:1px dashed #334155;border-radius:14px;padding:16px;text-align:center;"><div style="font-size:24px;margin-bottom:6px;">💰</div><div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:4px;">بخش تسک‌های نقدی فعال است</div><div style="font-size:11px;color:#94a3b8;line-height:1.7;">تسک‌های جدید به زودی قرار می‌گیرند.</div></div>';
  } else {
    tasksHtml = cloudTasks.map(function(t, idx) {
      var tid = String(t.docId || t.id), isDone = doneList.includes(tid) || busyTasks[tid];
      return '<div style="background:#0b0e14;border:1px solid #1e2433;border-radius:12px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;"><div><div style="font-size:13px;font-weight:800;color:#fff;">🎯 ' + escHtml(t.title) + '</div><div style="font-size:11px;color:#10b981;margin-top:3px;">پاداش: +' + Number(t.reward || 0).toLocaleString('fa-IR') + ' تومان</div></div>' + (isDone ? '<span style="font-size:11px;color:#10b981;font-weight:bold;background:rgba(16,185,129,0.12);padding:6px 10px;border-radius:8px;">✅ انجام شد</span>' : '<button onclick="completeCashTaskByIdx(' + idx + ')" style="background:#3b82f6;color:#fff;border:none;padding:8px 12px;border-radius:10px;font-size:11px;font-weight:bold;cursor:pointer;flex-shrink:0;">انجام تسک 〈</button>') + '</div>';
    }).join('');
  }
  box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1e2433;padding-bottom:10px;margin-bottom:12px;"><div><div style="font-size:15px;font-weight:900;color:#10b981;">🎯 تسک‌های پاداش نقدی (' + escHtml(currentUser.name) + ')</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">حساب: <span style="color:#60a5fa;direction:ltr;display:inline-block;">' + escHtml(currentUser.email) + '</span></div></div><span class="badge" style="background:rgba(16,185,129,0.15);color:#10b981;">' + doneList.length + ' انجام‌شده</span></div>' + tasksHtml;
}

function completeCashTaskByIdx(idx) {
  if (!currentUser || currentUser.type !== 'google') return;
  var t = cloudTasks[idx];
  if (!t) return;
  var taskId = String(t.docId || t.id);
  if (!Array.isArray(currentUser.completedTasks)) currentUser.completedTasks = [];
  if (currentUser.completedTasks.includes(taskId) || busyTasks[taskId]) return;
  busyTasks[taskId] = true;
  currentUser.completedTasks.push(taskId);
  renderUserTasksBox();
  var url = safeUrl(t.link);
  if (url !== '#') window.open(url, '_blank');
  var reward = Number(t.reward) || 0;
  setTimeout(function() {
    currentUser.balanceToman = (Number(currentUser.balanceToman) || 0) + reward;
    if (!Array.isArray(currentUser.prizesList)) currentUser.prizesList = [];
    currentUser.prizesList.unshift({ title: 'تسک: ' + t.title + ' (' + reward.toLocaleString('fa-IR') + ' ت)', amount: reward, date: new Date().toLocaleDateString('fa-IR') });
    syncUserToCloud(); renderUserTasksBox(); renderProfilePage();
    alert('✅ تبریک! پاداش تسک (' + reward.toLocaleString('fa-IR') + ' تومان) اضافه شد.');
  }, 1500);
}

function renderProfilePage() {
  var c = document.getElementById('profile-page-container');
  if (!c) return;
  if (!currentUser || currentUser.type !== 'google') {
    c.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:28px 18px;text-align:center;margin-top:14px;"><div style="font-size:40px;">🔐</div><div style="font-size:15px;font-weight:900;margin:8px 0;">پروفایل حساب کاربری</div><div style="font-size:12px;color:var(--muted);margin-bottom:16px;">برای مشاهده جوایز و ثبت کیف پول، با جیمیل وارد شوید.</div><button onclick="switchAccount()" class="spin-btn" style="width:100%;max-width:260px;">📧 ورود با جیمیل</button></div>';
    return;
  }
  var bal = (Number(currentUser.balanceToman) || 0).toLocaleString('fa-IR');
  var pList = Array.isArray(currentUser.prizesList) ? currentUser.prizesList : [];
  var hist = pList.length ? pList.map(function(p){ return '<div style="display:flex;justify-content:space-between;background:#0b0e14;padding:10px;border-radius:10px;margin-bottom:6px;font-size:12px;"><span style="color:#10b981;font-weight:bold;">🎁 ' + escHtml(p.title) + '</span><span style="color:var(--muted);">' + escHtml(p.date) + '</span></div>'; }).join('') : '<div style="font-size:12px;color:var(--muted);text-align:center;padding:10px;">هنوز جایزه‌ای دریافت نکرده‌اید.</div>';
  c.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:18px;margin-top:10px;"><div style="font-size:17px;font-weight:900;">👤 ' + escHtml(currentUser.name) + '</div><div style="font-size:12px;color:#60a5fa;direction:ltr;text-align:right;margin-bottom:14px;">' + escHtml(currentUser.email) + '</div><div style="background:#0f172a;border:1px solid #334155;border-radius:14px;padding:14px;text-align:center;margin-bottom:14px;"><div style="font-size:11px;color:#94a3b8;">💰 موجودی جوایز و تسک‌ها (واریز هر جمعه):</div><div style="font-size:22px;font-weight:900;color:#10b981;margin-top:4px;">' + bal + ' تومان</div></div><div style="background:#131824;padding:12px;border-radius:14px;margin-bottom:14px;"><div style="font-size:12px;font-weight:900;color:#60a5fa;margin-bottom:8px;">💳 ثبت آدرس کیف پول (سولانا / اتریوم)</div><input id="inp-sol-wallet" class="inp" type="text" value="' + escHtml(currentUser.solWallet||'') + '" placeholder="آدرس کیف پول Solana..." style="direction:ltr;text-align:left;"><input id="inp-eth-wallet" class="inp" type="text" value="' + escHtml(currentUser.ethWallet||'') + '" placeholder="آدرس کیف پول Ethereum (0x)..." style="direction:ltr;text-align:left;"><button onclick="saveUserWallets()" class="spin-btn" style="width:100%;background:#10b981;">💾 ذخیره کیف پول در حساب</button></div><div style="font-size:13px;font-weight:900;margin-bottom:8px;">🏆 تاریخچه جوایز و پاداش‌ها:</div>' + hist + '<button onclick="switchAccount()" style="width:100%;background:#ef4444;color:#fff;border:none;padding:11px;border-radius:12px;font-weight:bold;margin-top:12px;cursor:pointer;">🚪 خروج / تغییر جیمیل</button></div>';
}

function saveUserWallets() {
  if (!currentUser || currentUser.type !== 'google') return;
  currentUser.solWallet = document.getElementById('inp-sol-wallet').value.trim();
  currentUser.ethWallet = document.getElementById('inp-eth-wallet').value.trim();
  syncUserToCloud();
  alert('✅ کیف پول شما در حساب (' + currentUser.email + ') ذخیره شد!');
}

let newsList = [];
window.crCloudNews = [];
window.crLiveApiNews = [];

function fetchCloudData() {
  if (typeof db === "undefined") return;
  db.collection("drops").onSnapshot(function(snap) {
    cloudDrops = [];
    snap.forEach(function(doc) { cloudDrops.push(Object.assign({ docId: doc.id }, doc.data())); });
    renderProDrops();
  }, function(){});
  db.collection("tasks").onSnapshot(function(snap) {
    cloudTasks = [];
    snap.forEach(function(doc) { cloudTasks.push(Object.assign({ docId: doc.id }, doc.data())); });
    renderUserTasksBox();
  }, function(){});
}

async function fetchGlobalIndicators() {
  try {
    var res = await fetch('https://api.alternative.me/fng/?limit=1'), data = await res.json();
    if (data && data.data && data.data[0]) {
      var val = parseInt(data.data[0].value), numEl = document.querySelector('.gauge-num'), lblEl = document.querySelector('.gauge-lbl');
      if (numEl) numEl.innerText = val;
      if (lblEl) {
        if (val >= 55) { lblEl.innerText = 'طمع (صعودی)'; lblEl.style.color = '#10b981'; }
        else if (val <= 45) { lblEl.innerText = 'ترس (اصلاحی)'; lblEl.style.color = '#f43f5e'; }
        else { lblEl.innerText = 'خنثی (متعادل)'; lblEl.style.color = '#eab308'; }
      }
    }
  } catch (err) {}
  try {
    var resG = await fetch('https://api.coingecko.com/api/v3/global'), dataG = await resG.json();
    if (dataG && dataG.data && dataG.data.market_cap_percentage) {
      var btcDom = dataG.data.market_cap_percentage.btc, domEl = document.getElementById('btc-dom'), chgEl = document.getElementById('btc-dom-chg');
      if (domEl && btcDom) domEl.innerText = btcDom.toFixed(2) + '%';
      if (chgEl && dataG.data.market_cap_change_percentage_24h_usd !== undefined) {
        var mcChg = dataG.data.market_cap_change_percentage_24h_usd;
        chgEl.innerText = (mcChg >= 0 ? '+' : '') + mcChg.toFixed(2) + '% ' + (mcChg >= 0 ? '↗' : '↘');
        chgEl.style.color = mcChg >= 0 ? '#10b981' : '#f43f5e';
      }
    }
  } catch (err) {}
}

let isFetchingMarket = false;
async function fetchMarket() {
  if (isFetchingMarket) return;
  isFetchingMarket = true;
  fetchGlobalIndicators();
  var statusBadge = document.getElementById('market-status-badge');
  var cached = safeJsonParse('cr_cached_coins', []);
  if (cached.length && !coins.length) coins = cached;
  if (!coins || coins.length === 0) {
    coins = [
      { id: 'btc', symbol: 'btc', name: 'Bitcoin', image: 'https://assets.coincap.io/assets/icons/btc@2x.png', current_price: 89420, price_change_percentage_24h: 3.42, market_cap_rank: 1, high_24h: 91000, low_24h: 87500 },
      { id: 'eth', symbol: 'eth', name: 'Ethereum', image: 'https://assets.coincap.io/assets/icons/eth@2x.png', current_price: 3120, price_change_percentage_24h: 2.15, market_cap_rank: 2, high_24h: 3190, low_24h: 3040 },
      { id: 'sol', symbol: 'sol', name: 'Solana', image: 'https://assets.coincap.io/assets/icons/sol@2x.png', current_price: 188.5, price_change_percentage_24h: 6.84, market_cap_rank: 3, high_24h: 194, low_24h: 176 },
      { id: 'bnb', symbol: 'bnb', name: 'BNB', image: 'https://assets.coincap.io/assets/icons/bnb@2x.png', current_price: 642, price_change_percentage_24h: 1.12, market_cap_rank: 4, high_24h: 655, low_24h: 635 },
      { id: 'xrp', symbol: 'xrp', name: 'XRP', image: 'https://assets.coincap.io/assets/icons/xrp@2x.png', current_price: 1.48, price_change_percentage_24h: -1.85, market_cap_rank: 5, high_24h: 1.55, low_24h: 1.44 },
      { id: 'doge', symbol: 'doge', name: 'Dogecoin', image: 'https://assets.coincap.io/assets/icons/doge@2x.png', current_price: 0.365, price_change_percentage_24h: 8.40, market_cap_rank: 6, high_24h: 0.38, low_24h: 0.33 }
    ];
    if (statusBadge) { statusBadge.innerText = '● حالت کش'; statusBadge.style.color = '#eab308'; }
  }
  renderTopCards(); renderFullList(); updateGainersLosersPreview(); populateConverter(); updateLiveAutoUnlocks();
  try {
    var r = await fetch('https://min-api.cryptocompare.com/data/top/mktcapfull?limit=50&tsym=USD'), d = await r.json();
    if (d && Array.isArray(d.Data) && d.Data.length > 0) {
      coins = d.Data.map(function(item, idx) {
        var info = item.CoinInfo || {}, raw = (item.RAW && item.RAW.USD) ? item.RAW.USD : {}, sym = (info.Name || 'btc').toLowerCase();
        return { id: sym, symbol: sym, name: info.FullName || info.Name, image: 'https://assets.coincap.io/assets/icons/' + sym + '@2x.png', current_price: Number(raw.PRICE) || 1, price_change_percentage_24h: Number(raw.CHANGEPCT24HOUR) || 0, market_cap_rank: idx + 1, high_24h: Number(raw.HIGH24HOUR) || 1, low_24h: Number(raw.LOW24HOUR) || 1 };
      });
      localStorage.setItem('cr_cached_coins', JSON.stringify(coins));
      if (statusBadge) { statusBadge.innerText = '● آنلاین'; statusBadge.style.color = '#10b981'; }
      renderTopCards(); renderFullList(); updateGainersLosersPreview(); populateConverter(); updateLiveAutoUnlocks();
    }
  } catch (err) {
    if (statusBadge) { statusBadge.innerText = '● حالت کش'; statusBadge.style.color = '#eab308'; }
  } finally { isFetchingMarket = false; }
}

let lastRefreshClick = 0;
function manualRefresh() {
  var now = Date.now();
  if (now - lastRefreshClick < 4000) return;
  lastRefreshClick = now;
  document.getElementById('top-coins-cards').innerHTML = '<div style="color:var(--muted);font-size:12px;padding:10px;">⏳ در حال آپدیت...</div>';
  fetchMarket(); fetchAndTranslateLiveNews();
}

const FALLBACK_COIN_ICON = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%233b82f6%22/><text x=%2250%22 y=%2266%22 font-size=%2245%22 text-anchor=%22middle%22 fill=%22%23fff%22>₿</text></svg>";

function updateGainersLosersPreview() {
  if (!coins.length) return;
  var sorted = [].concat(coins).sort(function(a, b) { return (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0); });
  var topGainer = sorted[0], topLoser = sorted[sorted.length - 1];
  var gEl = document.getElementById('top-gainer-preview'), lEl = document.getElementById('top-loser-preview');
  if (gEl && topGainer) gEl.innerText = topGainer.symbol.toUpperCase() + ': +' + (topGainer.price_change_percentage_24h || 0).toFixed(2) + '%';
  if (lEl && topLoser) lEl.innerText = topLoser.symbol.toUpperCase() + ': ' + (topLoser.price_change_percentage_24h || 0).toFixed(2) + '%';
  generateLiveMarketReports();
}

function openGainersLosersModal(type) {
  if (!coins.length) return;
  var isGainer = type === 'gainers';
  var sorted = [].concat(coins).sort(function(a, b) { return isGainer ? (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0) : (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0); }).slice(0, 12);
  var rowsHtml = sorted.map(function(c, idx) {
    var chg = c.price_change_percentage_24h || 0, color = chg >= 0 ? '#10b981' : '#f43f5e';
    return '<div class="coin-row" onclick="showCoinDetail(\'' + escHtml(c.id) + '\')"><div style="display:flex;align-items:center;gap:10px;"><span style="font-size:11px;color:var(--muted);width:18px;">' + (idx + 1) + '</span><img src="' + escHtml(c.image) + '" onerror="this.src=\'' + FALLBACK_COIN_ICON + '\'" style="width:28px;height:28px;border-radius:50%;"><div><div style="font-weight:800;font-size:13px;text-transform:uppercase;">' + escHtml(c.symbol) + '</div><div style="font-size:11px;color:var(--muted);">' + escHtml(c.name) + '</div></div></div><div style="text-align:right;direction:ltr;"><div style="font-weight:800;font-size:13px;">$' + c.current_price.toLocaleString(undefined, {maximumFractionDigits: 4}) + '</div><div style="font-size:12px;font-weight:bold;color:' + color + ';">' + (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%</div></div></div>';
  }).join('');
  document.getElementById('modal-body').innerHTML = '<h3 style="font-size:16px;font-weight:900;margin-bottom:14px;">' + (isGainer ? '🚀 بیشترین رشد ۲۴ ساعته' : '🩸 بیشترین ریزش ۲۴ ساعته') + '</h3><div style="max-height:60vh;overflow-y:auto;margin-bottom:14px;">' + rowsHtml + '</div><button onclick="closeModal()" class="spin-btn" style="width:100%;">بستن لیست</button>';
  document.getElementById('modal').classList.add('show');
}

function renderTopCards() {
  var top6 = coins.slice(0, 6);
  document.getElementById('top-coins-cards').innerHTML = top6.map(function(c) {
    var chg = c.price_change_percentage_24h || 0, isPos = chg >= 0, color = isPos ? '#10b981' : '#f43f5e';
    var path = isPos ? 'M0,28 L20,24 L40,26 L60,15 L80,18 L100,6' : 'M0,8 L20,12 L40,10 L60,22 L80,20 L100,30';
    return '<div class="tc-card" onclick="showCoinDetail(\'' + escHtml(c.id) + '\')"><div class="tc-head"><img src="' + escHtml(c.image) + '" onerror="this.src=\'' + FALLBACK_COIN_ICON + '\'" alt=""><div class="tc-name">' + escHtml(c.name) + '</div></div><svg class="tc-spark" viewBox="0 0 100 35"><path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2.5"/></svg><div class="tc-foot"><div class="tc-price">$' + c.current_price.toLocaleString(undefined, {maximumFractionDigits: 4}) + '</div><div class="tc-chg" style="color:' + color + '">' + (isPos?'+':'') + chg.toFixed(2) + '%</div></div></div>';
  }).join('');
}

function toggleAllCoins() {
  showFullCoins = !showFullCoins;
  document.getElementById('all-coins-wrapper').style.display = showFullCoins ? 'block' : 'none';
  document.getElementById('view-all-txt').innerText = showFullCoins ? 'بستن لیست ✕' : 'مشاهده همه (50) 〈';
}

function renderFullList() {
  var q = (document.getElementById('coin-search') ? document.getElementById('coin-search').value : '').toLowerCase();
  var list = coins.filter(function(c) { return c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q); });
  document.getElementById('full-coins-list').innerHTML = list.map(function(c, i) {
    var chg = c.price_change_percentage_24h || 0;
    return '<div class="coin-row" onclick="showCoinDetail(\'' + escHtml(c.id) + '\')"><div style="display:flex;align-items:center;gap:10px;"><span style="font-size:11px;color:var(--muted);width:20px;">' + (c.market_cap_rank || i+1) + '</span><img src="' + escHtml(c.image) + '" onerror="this.src=\'' + FALLBACK_COIN_ICON + '\'" style="width:28px;height:28px;border-radius:50%;"><div><div style="font-weight:800;font-size:13px;text-transform:uppercase;">' + escHtml(c.symbol) + '</div><div style="font-size:11px;color:var(--muted);">' + escHtml(c.name) + '</div></div></div><div style="text-align:right;direction:ltr;"><div style="font-weight:800;font-size:13px;">$' + c.current_price.toLocaleString(undefined, {maximumFractionDigits: 4}) + '</div><div style="font-size:11px;color:' + (chg>=0?'#10b981':'#f43f5e') + ';">' + (chg>=0?'+':'') + chg.toFixed(2) + '%</div></div></div>';
  }).join('');
}

function showCoinDetail(id) {
  var c = coins.find(function(x) { return x.id === id; });
  if (!c) return;
  document.getElementById('modal-body').innerHTML = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;"><img src="' + escHtml(c.image) + '" onerror="this.src=\'' + FALLBACK_COIN_ICON + '\'" style="width:44px;height:44px;border-radius:50%;"><div><div style="font-size:18px;font-weight:900;">' + escHtml(c.name) + ' (' + escHtml(c.symbol.toUpperCase()) + ')</div><div style="font-size:12px;color:var(--muted);">رتبه بازار: #' + c.market_cap_rank + '</div></div></div><div style="background:#0b0e14;padding:14px;border-radius:16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;"><span style="color:var(--muted);font-size:12px;">قیمت فعلی:</span><span style="font-size:20px;font-weight:900;direction:ltr;">$' + c.current_price.toLocaleString(undefined, {maximumFractionDigits: 4}) + '</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;margin-bottom:16px;"><div style="background:#0b0e14;padding:10px;border-radius:12px;"><div style="color:var(--muted);">سقف ۲۴ساعته</div><b style="color:#10b981;direction:ltr;display:inline-block;">$' + (c.high_24h||c.current_price).toLocaleString(undefined, {maximumFractionDigits: 4}) + '</b></div><div style="background:#0b0e14;padding:10px;border-radius:12px;"><div style="color:var(--muted);">کف ۲۴ساعته</div><b style="color:#f43f5e;direction:ltr;display:inline-block;">$' + (c.low_24h||c.current_price).toLocaleString(undefined, {maximumFractionDigits: 4}) + '</b></div></div><button onclick="closeModal()" class="spin-btn" style="width:100%;">بستن</button>';
  document.getElementById('modal').classList.add('show');
}

function rebuildAllNews() {
  var combined = [].concat(window.crCloudNews || [], window.crLiveApiNews || [], window.crMarketLiveNews || []);
  if (combined.length > 0) newsList = combined;
  renderNews();
}

function renderNews() {
  var html = newsList.slice(0, 3).map(function(n) { return '<div class="news-card" onclick="openNewsModal(\'' + escHtml(n.id) + '\')"><div><div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;"><span class="news-time">' + escHtml(n.source) + '</span><span style="font-size:10px;color:var(--muted);">' + escHtml(n.time || 'جدید') + '</span></div><div style="font-size:13px;font-weight:800;color:#fff;line-height:1.4;">' + escHtml(n.title) + '</div></div></div>'; }).join('');
  var homePrev = document.getElementById('home-news-preview');
  if (homePrev) homePrev.innerHTML = html;
  var fullNews = document.getElementById('news-list-container');
  if (fullNews) fullNews.innerHTML = newsList.map(function(n) { return '<div class="info-card" onclick="openNewsModal(\'' + escHtml(n.id) + '\')"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span class="news-time">' + escHtml(n.source) + '</span><span style="font-size:11px;color:var(--muted);">' + escHtml(n.time || 'جدید') + '</span></div><div style="font-size:15px;font-weight:900;color:#fff;margin-bottom:6px;">' + escHtml(n.title) + '</div><div style="font-size:12px;color:var(--muted);line-height:1.5;">' + escHtml(n.desc) + '</div></div>'; }).join('');
}

function openNewsModal(id) {
  var n = newsList.find(function(x) { return String(x.id) === String(id); });
  if (!n) return;
  document.getElementById('modal-body').innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span class="news-time">' + escHtml(n.source) + '</span><span style="font-size:11px;color:var(--muted);">' + escHtml(n.time || 'جدید') + '</span></div><h3 style="font-size:17px;font-weight:900;margin-bottom:12px;color:#fff;">' + escHtml(n.title) + '</h3><p style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:16px;">' + escHtml(n.desc) + '</p><button onclick="closeModal()" class="spin-btn" style="width:100%;">بستن خبر</button>';
  document.getElementById('modal').classList.add('show');
}

function generateLiveMarketReports() {
  if (!coins || coins.length === 0) return;
  var btc = coins[0], eth = coins[1] || coins[0];
  var sorted = [].concat(coins).sort(function(a, b) { return (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0); });
  var topGainer = sorted[0], fngEl = document.querySelector('.gauge-num'), fngVal = fngEl ? fngEl.innerText : '55';
  var nowTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  rebuildAllNews();
}

async function translateToFa(text) {
  try {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=' + encodeURIComponent(text);
    var r = await fetch(url), d = await r.json();
    if (d && Array.isArray(d[0])) return d[0].map(function(part) { return part[0]; }).join('');
  } catch (err) {}
  return text;
}

let isFetchingNews = false;
async function fetchAndTranslateLiveNews() {
  if (isFetchingNews) return;
  isFetchingNews = true;
  generateLiveMarketReports();
  try {
    var res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN'), data = await res.json();
    if (data && Array.isArray(data.Data) && data.Data.length > 0) {
      var topItems = data.Data.slice(0, 6);
      var translatedList = await Promise.all(topItems.map(async function(item) {
        var rawBody = item.body ? item.body.substring(0, 180) + '...' : item.title;
        var pair = await Promise.all([translateToFa(item.title), translateToFa(rawBody)]);
        var minsAgo = Math.max(1, Math.floor((Date.now() / 1000 - (item.published_on || (Date.now() / 1000))) / 60));
        var timeStr = minsAgo < 60 ? (minsAgo + ' دقیقه پیش') : (Math.floor(minsAgo / 60) + ' ساعت پیش');
        return { id: 'live_fa_' + item.id, title: pair[0], source: (item.source_info && item.source_info.name) ? item.source_info.name : 'CryptoGlobal', time: timeStr, desc: pair[1] };
      }));
      if (translatedList.length > 0) { window.crLiveApiNews = translatedList; rebuildAllNews(); }
    }
  } catch (err) { rebuildAllNews(); }
  finally { isFetchingNews = false; }
}

// === crypto4youFA - Core (Part 2B - Final) ===
var FULL_30DAY_UNLOCKS = [
  { symbol: 'sui', name: 'Sui (SUI)', amountNum: 64190000, amountTxt: '64.19M SUI', day: 1, fallbackPrice: 2.15, pct: '2.26%' },
  { symbol: 'zeta', name: 'ZetaChain (ZETA)', amountNum: 53890000, amountTxt: '53.89M ZETA', day: 1, fallbackPrice: 0.68, pct: '9.35%' },
  { symbol: 'dydx', name: 'dYdX (DYDX)', amountNum: 8330000, amountTxt: '8.33M DYDX', day: 1, fallbackPrice: 1.25, pct: '1.30%' },
  { symbol: 'ena', name: 'Ethena (ENA)', amountNum: 40630000, amountTxt: '40.63M ENA', day: 2, fallbackPrice: 0.58, pct: '1.42%' },
  { symbol: 'kas', name: 'Kaspa (KAS)', amountNum: 155600000, amountTxt: '155.6M KAS', day: 5, fallbackPrice: 0.14, pct: '0.62%' },
  { symbol: 'jto', name: 'Jito (JTO)', amountNum: 11310000, amountTxt: '11.31M JTO', day: 7, fallbackPrice: 2.65, pct: '8.75%' },
  { symbol: 'ens', name: 'Ethereum Name (ENS)', amountNum: 1460000, amountTxt: '1.46M ENS', day: 8, fallbackPrice: 24.5, pct: '4.30%' },
  { symbol: 'move', name: 'Movement (MOVE)', amountNum: 50000000, amountTxt: '50.00M MOVE', day: 9, fallbackPrice: 0.72, pct: '2.20%' },
  { symbol: 'apt', name: 'Aptos (APT)', amountNum: 11310000, amountTxt: '11.31M APT', day: 12, fallbackPrice: 9.20, pct: '2.18%' },
  { symbol: 'sand', name: 'The Sandbox (SAND)', amountNum: 205590000, amountTxt: '205.5M SAND', day: 14, fallbackPrice: 0.38, pct: '8.40%' },
  { symbol: 'strk', name: 'Starknet (STRK)', amountNum: 64000000, amountTxt: '64.00M STRK', day: 15, fallbackPrice: 0.46, pct: '3.30%' },
  { symbol: 'sei', name: 'Sei (SEI)', amountNum: 55560000, amountTxt: '55.56M SEI', day: 15, fallbackPrice: 0.43, pct: '1.45%' },
  { symbol: 'arb', name: 'Arbitrum (ARB)', amountNum: 92650000, amountTxt: '92.65M ARB', day: 16, fallbackPrice: 0.56, pct: '2.33%' },
  { symbol: 'zk', name: 'ZKsync (ZK)', amountNum: 173000000, amountTxt: '173.0M ZK', day: 17, fallbackPrice: 0.15, pct: '4.70%' },
  { symbol: 'ape', name: 'ApeCoin (APE)', amountNum: 15600000, amountTxt: '15.60M APE', day: 17, fallbackPrice: 1.12, pct: '2.16%' },
  { symbol: 'manta', name: 'Manta Network (MANTA)', amountNum: 6670000, amountTxt: '6.67M MANTA', day: 18, fallbackPrice: 0.85, pct: '1.75%' },
  { symbol: 'pixel', name: 'Pixels (PIXEL)', amountNum: 54380000, amountTxt: '54.38M PIXEL', day: 19, fallbackPrice: 0.19, pct: '7.05%' },
  { symbol: 'zro', name: 'LayerZero (ZRO)', amountNum: 25710000, amountTxt: '25.71M ZRO', day: 20, fallbackPrice: 3.80, pct: '23.1%' },
  { symbol: 'scr', name: 'Scroll (SCR)', amountNum: 12500000, amountTxt: '12.50M SCR', day: 22, fallbackPrice: 0.92, pct: '6.50%' },
  { symbol: 'alt', name: 'AltLayer (ALT)', amountNum: 240100000, amountTxt: '240.1M ALT', day: 25, fallbackPrice: 0.13, pct: '10.4%' },
  { symbol: 'ron', name: 'Ronin (RON)', amountNum: 33400000, amountTxt: '33.40M RON', day: 27, fallbackPrice: 1.75, pct: '9.30%' },
  { symbol: 'tia', name: 'Celestia (TIA)', amountNum: 17500000, amountTxt: '17.50M TIA', day: 28, fallbackPrice: 5.15, pct: '3.95%' },
  { symbol: 'op', name: 'Optimism (OP)', amountNum: 31340000, amountTxt: '31.34M OP', day: 30, fallbackPrice: 1.62, pct: '2.50%' }
];
let unlocks = [];

function getClampedDate(year, month, day) {
  var maxDays = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, maxDays));
}

function updateLiveAutoUnlocks() {
  var now = new Date(), todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  unlocks = FULL_30DAY_UNLOCKS.map(function(item, idx) {
    var targetDate = getClampedDate(now.getFullYear(), now.getMonth(), item.day);
    if (targetDate.getTime() < todayStart) targetDate = getClampedDate(now.getFullYear(), now.getMonth() + 1, item.day);
    var diffDays = Math.round((targetDate.getTime() - todayStart) / 86400000);
    var faDate = targetDate.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' });
    var foundCoin = (coins || []).find(function(c) { return c.symbol && c.symbol.toLowerCase() === item.symbol; });
    var livePrice = foundCoin ? Number(foundCoin.current_price) : item.fallbackPrice;
    var valUsd = (item.amountNum * livePrice) / 1000000;
    var timeLabel = diffDays === 0 ? '🔥 امروز (' + faDate + ')' : (diffDays === 1 ? '⚡ فردا (' + faDate + ')' : diffDays + ' روز دیگر (' + faDate + ')');
    return { id: 'u30_' + idx, name: item.name, amt: item.amountTxt + ' (' + item.pct + ' عرضه)', val: '$' + valUsd.toFixed(2) + 'M', time: timeLabel, daysLeft: diffDays };
  }).sort(function(a, b) { return a.daysLeft - b.daysLeft; });
  renderUnlocks30Days();
}

function renderUnlocks30Days() {
  var c = document.getElementById('unlocks-list');
  if (!c) return;
  c.innerHTML = '<div style="background:#131824;border:1px solid #22293a;padding:10px 12px;border-radius:12px;margin:0 16px 12px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;"><span>📅 تقویم زنده ۳۰ روز آینده (' + unlocks.length + ' رویداد)</span><span style="color:#10b981;font-weight:bold;">● آپدیت خودکار روزانه</span></div>' +
    unlocks.map(function(u) {
      var isUrgent = u.daysLeft <= 3;
      return '<div class="info-card" style="border-right:3px solid ' + (isUrgent ? '#fb7185' : '#3b82f6') + ';"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><b style="font-size:15px;">🔓 ' + escHtml(u.name) + '</b><span class="badge" style="color:' + (isUrgent ? '#fb7185' : '#60a5fa') + ';">⏳ ' + escHtml(u.time) + '</span></div><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);background:#0b0e14;padding:8px 10px;border-radius:10px;"><span>حجم: <b style="color:#fff;">' + escHtml(u.amt) + '</b></span><span>ارزش: <b style="color:#10b981;direction:ltr;display:inline-block;">' + escHtml(u.val) + '</b></span></div></div>';
    }).join('');
}

var vcs = [
  { id: 101, tierNum: 1, name: "a16z Crypto", tier: "Tier 1 🏆", fund: "$7.6B", focus: "زیرساخت لایه ۱، هوش مصنوعی و دیفای", projects: "Solana, Sui, Aptos, EigenLayer, LayerZero", success: "بالاترین نرخ یونیکورن‌سازی در کریپتو", desc: "بزرگ‌ترین و پرنفوذترین صندوق سرمایه‌گذاری خطرپذیر در حوزه وب۳." },
  { id: 102, tierNum: 1, name: "Paradigm", tier: "Tier 1 🏆", fund: "$10.5B", focus: "پروتکل‌های لایه ۱ و صرافی‌های غیرمتمرکز", projects: "Uniswap, Monad, Optimism, Blur, Starknet", success: "بیش از ۸۵٪ پروژه‌ها با ایردراپ‌های سنگین", desc: "صندوق تحقیقاتی-سرمایه‌گذاری تاسیس‌شده توسط هم‌بنیان‌گذار کوین‌بیس." },
  { id: 103, tierNum: 1, name: "YZi Labs (Binance Labs)", tier: "Tier 1 🏆", fund: "$10.0B", focus: "اکوسیستم بایننس، دیفای و زیرساخت", projects: "Polygon, Sui, Celestia, Pendle, EigenLayer", success: "شماره ۱ در لیست شدن مستقیم در صرافی بایننس", desc: "بازوی سرمایه‌گذاری رسمی اکوسیستم بایننس." },
  { id: 104, tierNum: 1, name: "Polychain Capital", tier: "Tier 1 🏆", fund: "$6.8B", focus: "شبکه‌های ماژولار، لایه اول و ZK", projects: "Celestia, Arbitrum, Berachain, dYdX", success: "پیشگام سرمایه‌گذاری در سید راند پروژه‌های زیرساختی", desc: "یکی از قدیمی‌ترین و موفق‌ترین صندوق‌های اختصاصی رمزارز." },
  { id: 105, tierNum: 1, name: "Pantera Capital", tier: "Tier 1 🏆", fund: "$5.2B", focus: "زیرساخت وب۳، دیفای و لایه اول", projects: "TON, Solana, Arbitrum, Starknet, Ondo", success: "اولین صندوق سرمایه‌گذاری نهادی کریپتو در آمریکا", desc: "صندوق پیشرو با تمرکز بر سرمایه‌گذاری زودهنگام در توکن‌ها." },
  { id: 106, tierNum: 1, name: "Coinbase Ventures", tier: "Tier 1 🏆", fund: "$4.5B", focus: "اکوسیستم Base، لایه ۲ و زیرساخت", projects: "Arbitrum, Optimism, EigenLayer, Sui, Aptos", success: "پشتوانه مستقیم برای لیست شدن در صرافی Coinbase", desc: "بازوی سرمایه‌گذاری صرافی کوین‌بیس با بیشترین تعداد سرمایه‌گذاری فعال." },
  { id: 201, tierNum: 2, name: "Dragonfly Capital", tier: "Tier 2 🥈", fund: "$3.2B", focus: "دیفای، لایه اول‌های سریع و کراس‌چین", projects: "Monad, Ethena, Aptos, Avalanche, Near", success: "رهبر راندهای سرمایه‌گذاری بزرگ در آسیا و آمریکا", desc: "صندوق بین‌المللی برتر با تمرکز ویژه بر پروتکل‌های مالی غیرمتمرکز." },
  { id: 202, tierNum: 2, name: "Multicoin Capital", tier: "Tier 2 🥈", fund: "$2.8B", focus: "اکوسیستم سولانا و پروژه‌های DePIN", projects: "Solana, Render, Helium, io.net, Sei", success: "حامی اصلی اکوسیستم سولانا و DePIN", desc: "صندوق سرمایه‌گذاری مبتنی بر تزهای تحقیقاتی عمیق." },
  { id: 203, tierNum: 2, name: "Framework Ventures", tier: "Tier 2 🥈", fund: "$1.9B", focus: "دیفای، اوراکل‌ها و گیمینگ وب۳", projects: "Chainlink, Aave, Berachain, The Graph", success: "متخصص رشد اکوسیستم‌های دیفای", desc: "یکی از بزرگ‌ترین سرمایه‌گذاران اولیه در پروژه‌های بنیادین دیفای." },
  { id: 204, tierNum: 2, name: "Blockchain Capital", tier: "Tier 2 🥈", fund: "$2.4B", focus: "پروتکل‌های لایه ۲، امنیت و دیفای", projects: "EigenLayer, ZKsync, Worldcoin, Aave", success: "بیش از ۱۵۰ سرمایه‌گذاری موفق از سال ۲۰۱۳", desc: "از باسابقه‌ترین شرکت‌های ونتچر کپیتال اختصاصی بلاکچین." },
  { id: 301, tierNum: 3, name: "Animoca Brands", tier: "Tier 3 🥉", fund: "$1.8B", focus: "گیمینگ وب۳، متاورس و NFT", projects: "The Sandbox, Axie, Mocaverse, Pixels, TON", success: "بزرگ‌ترین سرمایه‌گذار بازی‌های بلاکچینی", desc: "رهبر جهانی در حوزه مالکیت دیجیتال و گیم‌فای." },
  { id: 302, tierNum: 3, name: "Jump Crypto", tier: "Tier 3 🥉", fund: "$1.6B", focus: "زیرساخت معاملاتی، اوراکل و بریج‌ها", projects: "Wormhole, Pyth, Sui, Aptos, Injective", success: "قدرتمندترین بازارساز و توسعه‌دهنده زیرساخت", desc: "بخش رمزارز غول معاملاتی Jump Trading." },
  { id: 303, tierNum: 3, name: "Delphi Ventures", tier: "Tier 3 🥉", fund: "$1.2B", focus: "گیمینگ، دیفای و لایه‌های ماژولار", projects: "Ethena, Celestia, dYdX, Ronin", success: "پشتوانه تحلیلی قوی در طراحی توکنومیکس", desc: "بازوی سرمایه‌گذاری موسسه تحقیقاتی Delphi Digital." },
  { id: 304, tierNum: 3, name: "HashKey Capital", tier: "Tier 3 🥉", fund: "$1.5B", focus: "زیرساخت آسیا، اتریوم و لایه دوم", projects: "Polkadot, Cosmos, AltLayer, Scroll", success: "بزرگ‌ترین صندوق نهادی کریپتو در شرق آسیا", desc: "پل ارتباطی پروژه‌های بزرگ غربی با بازارهای آسیایی." },
  { id: 401, tierNum: 4, name: "OKX Ventures", tier: "Tier 4 ⭐", fund: "$800M", focus: "اکوسیستم بیت‌کوین، لایه ۲ و کیف پول", projects: "LayerZero, Starknet, Scroll, Babylon", success: "شانس بالای لیست شدن در صرافی OKX", desc: "بازوی سرمایه‌گذاری صرافی جهانی OKX." },
  { id: 402, tierNum: 4, name: "Wintermute Ventures", tier: "Tier 4 ⭐", fund: "$650M", focus: "تامین نقدینگی، DEXها و زیرساخت", projects: "Ethena, Arbitrum, Optimism, Blur, ZetaChain", success: "تضمین نقدینگی و بازارسازی در لحظه لیست شدن", desc: "بازوی سرمایه‌گذاری یکی از بزرگ‌ترین بازارسازان کریپتو." },
  { id: 501, tierNum: 5, name: "DWF Labs", tier: "Tier 5 🔹", fund: "$700M", focus: "بازارسازی، سرمایه‌گذاری OTC و رشد سریع", projects: "TON, Fetch.ai, Floki, Conflux", success: "ایجاد موج‌های معاملاتی پرحجم", desc: "بازارساز نسل جدید و سرمایه‌گذار پرکار در توکن‌های در حال رشد." },
  { id: 502, tierNum: 5, name: "NGC Ventures", tier: "Tier 5 🔹", fund: "$450M", focus: "پروژه‌های زیرساختی آسیا و کراس‌چین", projects: "Solana, Polkadot, Oasis, Algorand", success: "شبکه گسترده ارتباطی با صرافی‌های آسیایی", desc: "صندوق سرمایه‌گذاری نهادی تشکیل‌شده توسط کارآفرینان تکنولوژی." }
];
var currentVcTierFilter = 0;

function setupVcsFilterUI() {
  var vcsPage = document.getElementById('page-vcs');
  if (!vcsPage || document.getElementById('vcs-filter-box')) return;
  var headWrap = vcsPage.querySelector('.sec-wrap');
  if (headWrap) {
    var fBox = document.createElement('div');
    fBox.id = 'vcs-filter-box';
    fBox.innerHTML = '<div class="filter-chips"><button class="f-chip vc-chip active" onclick="setVcTier(0, this)">🌐 همه (Tier 1-5)</button><button class="f-chip vc-chip" onclick="setVcTier(1, this)">🏆 Tier 1</button><button class="f-chip vc-chip" onclick="setVcTier(2, this)">🥈 Tier 2</button><button class="f-chip vc-chip" onclick="setVcTier(3, this)">🥉 Tier 3</button><button class="f-chip vc-chip" onclick="setVcTier(4, this)">⭐ Tier 4</button><button class="f-chip vc-chip" onclick="setVcTier(5, this)">🔹 Tier 5</button></div>';
    headWrap.appendChild(fBox);
  }
}

function setVcTier(t, btn) {
  currentVcTierFilter = t;
  var chips = document.querySelectorAll('.vc-chip');
  for (var i = 0; i < chips.length; i++) chips[i].classList.remove('active');
  if (btn) btn.classList.add('active');
  renderVcsByTier();
}

function renderVcsByTier() {
  setupVcsFilterUI();
  var vcsContainer = document.getElementById('vcs-list');
  if (!vcsContainer) return;
  var list = currentVcTierFilter === 0 ? vcs : vcs.filter(function(v) { return v.tierNum === currentVcTierFilter; });
  if (!list.length) {
    vcsContainer.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">موردی یافت نشد.</div>';
    return;
  }
  var tierColors = { 1: '#eab308', 2: '#3b82f6', 3: '#10b981', 4: '#a855f7', 5: '#64748b' };
  vcsContainer.innerHTML = list.map(function(v) {
    var col = tierColors[v.tierNum] || '#3b82f6';
    return '<div class="info-card" onclick="openVCModal(' + v.id + ')" style="border-right:3px solid ' + col + ';"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><div style="font-size:15px;font-weight:900;">🏛️ ' + escHtml(v.name) + '</div><span class="badge" style="color:' + col + ';">' + escHtml(v.tier) + ' | ' + escHtml(v.fund) + '</span></div><div style="font-size:12px;color:var(--muted);margin-bottom:8px;line-height:1.6;">' + escHtml(v.desc) + '</div><div style="font-size:11px;color:#60a5fa;background:#0b0e14;padding:8px 10px;border-radius:10px;">🚀 پورتفولیو: <b style="color:#fff;">' + escHtml(v.projects) + '</b></div><div style="font-size:11px;color:#10b981;margin-top:6px;">📈 عملکرد: ' + escHtml(v.success) + '</div></div>';
  }).join('');
}

function openVCModal(id) {
  var v = vcs.find(function(x) { return x.id === id; });
  if (!v) return;
  document.getElementById('modal-body').innerHTML = '<h3 style="font-size:18px;font-weight:900;margin-bottom:6px;">🏛️ صندوق ' + escHtml(v.name) + '</h3><span class="badge" style="display:inline-block;margin-bottom:12px;">' + escHtml(v.tier) + ' | سرمایه تحت مدیریت: ' + escHtml(v.fund) + '</span><p style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:14px;">' + escHtml(v.desc) + '</p><div style="background:#0b0e14;padding:12px;border-radius:14px;margin-bottom:14px;font-size:12px;line-height:1.8;"><div>🎯 <b>حوزه تمرکز:</b> ' + escHtml(v.focus) + '</div><div>🚀 <b>پروژه‌های موفق:</b> <span style="color:#60a5fa">' + escHtml(v.projects) + '</span></div><div>📈 <b>آمار موفقیت:</b> <span style="color:#10b981">' + escHtml(v.success) + '</span></div></div><button onclick="closeModal()" class="spin-btn" style="width:100%;">بستن</button>';
  document.getElementById('modal').classList.add('show');
}

var currentDropFilter = 'all';

function setupDropsFilterUI() {
  var dropsPage = document.getElementById('page-drops');
  if (!dropsPage || document.getElementById('drops-search-box')) return;
  var headWrap = dropsPage.querySelector('.sec-wrap');
  if (headWrap) {
    var filterBox = document.createElement('div');
    filterBox.id = 'drops-search-box';
    filterBox.innerHTML = '<input id="drop-q-inp" class="inp" type="text" placeholder="🔍 جستجوی نام ایردراپ، شبکه یا سرمایه‌گذار..." oninput="renderProDrops()" style="margin-bottom:10px;"><div class="filter-chips"><button class="f-chip drop-chip active" onclick="setDropFilter(\'all\', this)">🌐 همه پروژه‌ها</button><button class="f-chip drop-chip" onclick="setDropFilter(\'free\', this)">🆓 رایگان</button><button class="f-chip drop-chip" onclick="setDropFilter(\'paid\', this)">💰 نیازمند سرمایه</button><button class="f-chip drop-chip" onclick="setDropFilter(\'urgent\', this)">🔥 نزدیک به پایان</button><button class="f-chip drop-chip" onclick="setDropFilter(\'saved\', this)">⭐ ذخیره‌شده‌ها</button></div>';
    headWrap.appendChild(filterBox);
  }
}

function setDropFilter(f, btn) {
  currentDropFilter = f;
  var chips = document.querySelectorAll('.drop-chip');
  for (var i = 0; i < chips.length; i++) chips[i].classList.remove('active');
  if (btn) btn.classList.add('active');
  renderProDrops();
}

function getAllAdminDropsOnly() {
  return (cloudDrops || []).map(function(d) {
    var customSteps = Array.isArray(d.steps) && d.steps.length > 0 ? d.steps : [
      '۱. از طریق دکمه زیر وارد لینک رسمی کمپین شوید.',
      '۲. کیف پول خود را متصل کرده و مراحل (' + (d.task || 'تسک‌ها') + ') را تکمیل کنید.',
      '۳. پروژه را در پروفایل خود ذخیره کنید تا اطلاعیه‌های بعدی را از دست ندهید.'
    ];
    return {
      name: d.name || 'پروژه ایردراپ', cost: d.cost || 'رایگان', chain: d.chain || 'Multi-Chain',
      vc: d.vc || '-', raised: d.raised || '-', reward: d.reward || 'توکن پروژه',
      deadline: d.urgent ? 'نزدیک به پایان 🔥' : (d.deadline || 'فعال'), urgent: Boolean(d.urgent),
      updatedAt: d.updatedAt || 'به‌روز', link: safeUrl(d.link), task: d.task || '',
      steps: customSteps
    };
  });
}

function renderProDrops() {
  setupDropsFilterUI();
  var dropsContainer = document.getElementById('drops-list');
  if (!dropsContainer) return;
  var allD = getAllAdminDropsOnly();
  if (allD.length === 0) {
    dropsContainer.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:26px 16px;margin:0 16px;text-align:center;color:var(--muted);font-size:13px;"><div style="font-size:32px;margin-bottom:8px;">🪂</div><div>در حال حاضر هیچ ایردراپی ثبت نشده است.</div></div>';
    return;
  }
  var qEl = document.getElementById('drop-q-inp'), q = qEl ? qEl.value.trim().toLowerCase() : '';
  var filtered = allD.filter(function(d) {
    if (q && !(d.name.toLowerCase().includes(q) || d.chain.toLowerCase().includes(q) || d.vc.toLowerCase().includes(q))) return false;
    if (currentDropFilter === 'free' && !d.cost.includes('رایگان')) return false;
    if (currentDropFilter === 'paid' && d.cost.includes('رایگان')) return false;
    if (currentDropFilter === 'urgent' && !d.urgent) return false;
    if (currentDropFilter === 'saved' && !(savedDrops || []).includes(d.name)) return false;
    return true;
  });
  if (filtered.length === 0) {
    dropsContainer.innerHTML = '<div style="color:var(--muted);text-align:center;padding:24px;font-size:13px;">پروژه‌ای با این فیلتر یافت نشد.</div>';
    return;
  }
  dropsContainer.innerHTML = filtered.map(function(d, idx) {
    var isFree = d.cost.includes('رایگان'), isSaved = (savedDrops || []).includes(d.name);
    var clicks = parseInt(localStorage.getItem('cr_clk_' + d.name) || '12');
    return '<div class="info-card" onclick="openProDropDetail(' + idx + ')" style="border-right:3px solid ' + (d.urgent ? '#f43f5e' : (isFree ? '#10b981' : '#eab308')) + ';"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><div style="font-size:16px;font-weight:900;">🪂 ' + escHtml(d.name) + (isSaved ? ' ⭐' : '') + '</div><div style="display:flex;gap:5px;"><span class="badge" style="background:' + (isFree ? 'rgba(16,185,129,0.15);color:#10b981' : 'rgba(234,179,8,0.15);color:#eab308') + ';">' + escHtml(d.cost) + '</span><span class="badge" style="color:' + (d.urgent ? '#fb7185' : '#60a5fa') + ';">⏳ ' + escHtml(d.deadline) + '</span></div></div><div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6;">' + escHtml(d.task) + '</div><div style="display:flex;flex-wrap:wrap;gap:8px;font-size:11px;background:#0b0e14;padding:8px 10px;border-radius:10px;margin-bottom:8px;"><span>⛓️ شبکه: <b style="color:#fff;">' + escHtml(d.chain) + '</b></span><span>| 💰 سرمایه: <b style="color:#10b981;">' + escHtml(d.raised) + '</b></span><span>| 🏛️ حامی: <b style="color:#60a5fa;">' + escHtml(d.vc) + '</b></span></div><div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#94a3b8;"><span>🕒 بروزرسانی: ' + escHtml(d.updatedAt) + ' | 👁️ ' + clicks + ' بازدید</span><span style="color:#3b82f6;font-weight:bold;">📖 جزئیات و لینک ورود 〈</span></div></div>';
  }).join('');
  window.crCurrentFilteredDrops = filtered;
}

function openProDropDetail(idx) {
  var list = window.crCurrentFilteredDrops || getAllAdminDropsOnly(), d = list[idx];
  if (!d) return;
  localStorage.setItem('cr_clk_' + d.name, parseInt(localStorage.getItem('cr_clk_' + d.name) || '12') + 1);
  var isSaved = (savedDrops || []).includes(d.name);
  var stepsHtml = (d.steps || []).map(function(s) { return '<div style="background:#131824;padding:9px 12px;border-radius:10px;margin-bottom:6px;font-size:12px;line-height:1.7;border-right:2px solid #3b82f6;">' + escHtml(s) + '</div>'; }).join('');
  document.getElementById('modal-body').innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><h3 style="font-size:18px;font-weight:900;margin:0;">🪂 ' + escHtml(d.name) + '</h3><span class="badge">' + escHtml(d.cost) + '</span></div><div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">🕒 بروزرسانی: ' + escHtml(d.updatedAt) + ' | ⏳ وضعیت: <b style="color:#fb7185;">' + escHtml(d.deadline) + '</b></div><p style="font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:12px;">' + escHtml(d.task) + '</p><div style="background:#0b0e14;padding:12px;border-radius:14px;margin-bottom:14px;font-size:12px;line-height:1.9;"><div>⛓️ <b>شبکه:</b> ' + escHtml(d.chain) + '</div><div>🏛️ <b>سرمایه‌گذاران:</b> <span style="color:#60a5fa">' + escHtml(d.vc) + '</span></div><div>💰 <b>سرمایه جذب‌شده:</b> <span style="color:#10b981">' + escHtml(d.raised) + '</span></div><div>🎁 <b>پاداش کمپین:</b> <span style="color:#eab308">' + escHtml(d.reward) + '</span></div></div><div style="margin-bottom:14px;"><div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:8px;">🎓 مراحل شرکت در ایردراپ:</div>' + stepsHtml + '</div><a href="' + escHtml(d.link) + '" target="_blank" rel="noopener noreferrer" class="spin-btn" style="display:block;text-align:center;text-decoration:none;margin-bottom:8px;">🚀 ورود مستقیم به ایردراپ و شروع تسک‌ها</a><button onclick="toggleSaveDropByIdx(' + idx + ')" style="width:100%;background:' + (isSaved ? '#ef4444' : '#10b981') + ';color:#fff;border:none;padding:11px;border-radius:12px;font-weight:bold;margin-bottom:8px;cursor:pointer;">' + (isSaved ? '⭐ حذف از ایردراپ‌های من' : '⭐ ذخیره در پروفایل من') + '</button><button onclick="closeModal()" style="width:100%;background:#222838;color:#fff;border:none;padding:10px;border-radius:12px;cursor:pointer;">بستن</button>';
  document.getElementById('modal').classList.add('show');
}

function toggleSaveDropByIdx(idx) {
  var list = window.crCurrentFilteredDrops || getAllAdminDropsOnly(), d = list[idx];
  if (!d) return;
  if (savedDrops.includes(d.name)) savedDrops = savedDrops.filter(function(x) { return x !== d.name; });
  else savedDrops.push(d.name);
  localStorage.setItem('cr_user_saved_drops', JSON.stringify(savedDrops));
  syncUserToCloud(); closeModal(); renderProDrops();
}

window.liveUsdtToman = Number(localStorage.getItem('cr_last_usdt_irt')) || 256000;
let userEditedUsdtManually = false;

function onManualUsdtInput() {
  userEditedUsdtManually = true;
  var badge = document.getElementById('usdt-live-badge');
  if (badge) { badge.innerText = 'دستی (ثابت)'; badge.style.color = '#eab308'; }
  calcConv();
}

function populateConverter() {
  var sel = document.getElementById('c-sel');
  if (!sel || !coins.length) return;
  sel.innerHTML = coins.slice(0, 30).map(function(c) { return '<option value="' + escHtml(c.id) + '">' + escHtml(c.name) + ' (' + escHtml(c.symbol.toUpperCase()) + ')</option>'; }).join('');
  calcConv();
}

function calcConv() {
  var amt = parseFloat(document.getElementById('c-amt') ? document.getElementById('c-amt').value : 0) || 0;
  var id = document.getElementById('c-sel') ? document.getElementById('c-sel').value : '';
  var c = coins.find(function(x) { return x.id === id; });
  var usdVal = amt * (c ? c.current_price : 0);
  var rateInp = document.getElementById('c-usdt-rate');
  var currentRate = rateInp && Number(rateInp.value) > 0 ? Number(rateInp.value) : (window.liveUsdtToman || 256000);
  var tomanVal = Math.round(usdVal * currentRate);
  var resEl = document.getElementById('c-res');
  if (resEl) {
    resEl.innerHTML = '$' + usdVal.toLocaleString(undefined, {maximumFractionDigits: 4}) +
      '<div style="font-size:15px;color:#eab308;margin-top:8px;direction:rtl;font-weight:900;">≈ ' + tomanVal.toLocaleString('fa-IR') + ' تومان</div>';
  }
}

async function fetchLiveIranUsdtRate() {
  if (userEditedUsdtManually) return;
  var rateInp = document.getElementById('c-usdt-rate'), badge = document.getElementById('usdt-live-badge');
  if (rateInp && !rateInp.dataset.initialized) { rateInp.value = window.liveUsdtToman; rateInp.dataset.initialized = '1'; }
  try {
    var r1 = await fetch('https://api.nobitex.ir/v2/orderbook/USDTIRT'), d1 = await r1.json();
    if (d1 && d1.lastTradePrice) {
      var toman = Math.round(Number(d1.lastTradePrice) / 10);
      if (toman > 50000) {
        window.liveUsdtToman = toman;
        localStorage.setItem('cr_last_usdt_irt', String(toman));
        if (rateInp && !userEditedUsdtManually) rateInp.value = toman;
        if (badge && !userEditedUsdtManually) badge.innerText = 'زنده (نوبیتکس)';
        calcConv(); return;
      }
    }
  } catch (err) {}
  calcConv();
}

function renderLists() { renderProDrops(); renderVcsByTier(); renderUnlocks30Days(); }

setupWheelAndTasksDOM();
renderLists();
initAuth();
fetchCloudData();
fetchMarket();
fetchLiveIranUsdtRate();
fetchAndTranslateLiveNews();
setInterval(fetchAndTranslateLiveNews, 180000);
setInterval(fetchLiveIranUsdtRate, 60000);
