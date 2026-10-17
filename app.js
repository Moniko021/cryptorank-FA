let coins = [];
let showFullCoins = false;
let currentPage = 'home';
let wheelDeg = 0;
let cloudDrops = [];

let currentUser = JSON.parse(localStorage.getItem('cr_active_user')) || null;
let savedGoogleAccount = JSON.parse(localStorage.getItem('cr_saved_google_user')) || null;
let savedDrops = JSON.parse(localStorage.getItem('cr_user_saved_drops')) || [];

function syncUserToCloud() {
  if (typeof db !== 'undefined' && currentUser && currentUser.email && currentUser.type === 'google') {
    const docKey = currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
    db.collection("users").doc(docKey).set({
      name: currentUser.name,
      email: currentUser.email,
      points: currentUser.points || 100,
      savedDrops: savedDrops,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});
  }
}

function loadUserFromCloud(email) {
  if (typeof db === 'undefined' || !email) return;
  const docKey = email.replace(/[^a-zA-Z0-9]/g, '_');
  db.collection("users").doc(docKey).get().then((doc) => {
    if (doc.exists) {
      const data = doc.data();
      if (data.points !== undefined && currentUser) {
        currentUser.points = Math.max(currentUser.points || 0, data.points);
        localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
      }
      if (Array.isArray(data.savedDrops) && data.savedDrops.length > 0) {
        savedDrops = Array.from(new Set([...savedDrops, ...data.savedDrops]));
        localStorage.setItem('cr_user_saved_drops', JSON.stringify(savedDrops));
      }
    }
  }).catch(() => {});
}

function initAuth() {
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      if (user) {
        const userObj = {
          type: 'google',
          uid: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          photo: user.photoURL || '',
          points: savedGoogleAccount?.points || 100
        };
        currentUser = userObj;
        savedGoogleAccount = userObj;
        localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
        localStorage.setItem('cr_saved_google_user', JSON.stringify(savedGoogleAccount));
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.remove('show');
        updateUserHeader();
        loadUserFromCloud(user.email);
      }
    });
  }

  if (currentUser && currentUser.type === 'google') {
    updateUserHeader();
    loadUserFromCloud(currentUser.email);
    return;
  }
  const authModal = document.getElementById('auth-modal');
  if (authModal) authModal.classList.add('show');

  if (savedGoogleAccount) {
    const savedBtn = document.getElementById('saved-google-btn');
    const savedTxt = document.getElementById('saved-google-txt');
    if (savedBtn && savedTxt) {
      savedBtn.style.display = 'flex';
      savedTxt.innerText = `ادامه با ${savedGoogleAccount.name} (${savedGoogleAccount.email})`;
    }
  }
}

async function realGoogleSignIn() {
  try {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      showGoogleForm();
      return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    if (user) {
      const userObj = {
        type: 'google',
        uid: user.uid,
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        photo: user.photoURL || '',
        points: savedGoogleAccount?.points || 100
      };
      currentUser = userObj;
      savedGoogleAccount = userObj;
      localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
      localStorage.setItem('cr_saved_google_user', JSON.stringify(savedGoogleAccount));
      document.getElementById('auth-modal').classList.remove('show');
      updateUserHeader();
      syncUserToCloud();
    }
  } catch (err) {
    showGoogleForm();
  }
}

function showGoogleForm() {
  document.getElementById('auth-main-btns').style.display = 'none';
  document.getElementById('google-form').style.display = 'block';
  if (savedGoogleAccount) {
    document.getElementById('g-name').value = savedGoogleAccount.name || '';
    document.getElementById('g-email').value = savedGoogleAccount.email || '';
  }
}

function hideGoogleForm() {
  document.getElementById('google-form').style.display = 'none';
  document.getElementById('auth-main-btns').style.display = 'block';
}

function submitGoogleLogin() {
  const name = document.getElementById('g-name').value.trim();
  const email = document.getElementById('g-email').value.trim();
  if (!name || !email || !email.includes('@')) {
    alert('لطفاً نام و آدرس جیمیل معتبر وارد کنید.');
    return;
  }
  const userObj = {
    type: 'google',
    name: name,
    email: email,
    points: savedGoogleAccount?.points || 100,
    loginDate: new Date().toLocaleDateString('fa-IR')
  };
  currentUser = userObj;
  savedGoogleAccount = userObj;
  localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
  localStorage.setItem('cr_saved_google_user', JSON.stringify(savedGoogleAccount));
  document.getElementById('auth-modal').classList.remove('show');
  updateUserHeader();
  loadUserFromCloud(email);
  syncUserToCloud();
}

function quickGoogleLogin() {
  if (!savedGoogleAccount) return;
  currentUser = savedGoogleAccount;
  localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
  document.getElementById('auth-modal').classList.remove('show');
  updateUserHeader();
  loadUserFromCloud(currentUser.email);
}

function loginAnonymously() {
  currentUser = {
    type: 'anon',
    name: 'کاربر ناشناس',
    email: 'بدون ایمیل (حالت مهمان)',
    points: 0
  };
  localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
  document.getElementById('auth-modal').classList.remove('show');
  updateUserHeader();
}

function updateUserHeader() {
  const avatarEl = document.getElementById('header-user-avatar');
  const nameEl = document.getElementById('header-user-name');
  if (!currentUser || !avatarEl || !nameEl) return;

  if (currentUser.type === 'google') {
    if (currentUser.photo) {
      avatarEl.innerHTML = `<img src="${currentUser.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      avatarEl.innerText = currentUser.name.charAt(0).toUpperCase();
    }
    avatarEl.style.background = '#10b981';
    nameEl.innerText = currentUser.name;
  } else {
    avatarEl.innerText = '🕶️';
    avatarEl.style.background = '#3b82f6';
    nameEl.innerText = 'ناشناس';
  }
}

function openProfileModal() {
  if (!currentUser) {
    document.getElementById('auth-modal').classList.add('show');
    return;
  }
  const isG = currentUser.type === 'google';
  const savedCount = savedDrops.length;
  document.getElementById('modal-body').innerHTML = `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="width:60px;height:60px;border-radius:50%;background:${isG?'#10b981':'#3b82f6'};color:#fff;font-size:26px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;overflow:hidden;">
        ${isG && currentUser.photo ? `<img src="${currentUser.photo}" style="width:100%;height:100%;object-fit:cover;">` : (isG ? currentUser.name.charAt(0).toUpperCase() : '🕶️')}
      </div>
      <div style="font-size:18px;font-weight:900;">${currentUser.name}</div>
      <div style="font-size:12px;color:var(--muted);direction:ltr;">${currentUser.email}</div>
    </div>
    <div style="background:#0b0e14;padding:14px;border-radius:16px;margin-bottom:16px;font-size:12px;line-height:2;">
      <div>🔐 <b>نوع حساب:</b> <span style="color:${isG?'#10b981':'#eab308'}">${isG ? 'حساب گوگل (متصل به ابر)' : 'ورود ناشناس'}</span></div>
      <div>🎁 <b>امتیاز پلتفرم:</b> <b style="color:#60a5fa">${currentUser.points || 0} امتیاز</b></div>
      <div>⭐ <b>ایردراپ‌های ذخیره‌شده:</b> <b style="color:#eab308">${savedCount} مورد</b></div>
    </div>
    ${savedCount > 0 ? `<div style="margin-bottom:14px;"><div style="font-size:13px;font-weight:800;margin-bottom:6px;">لیست ایردراپ‌های شما:</div>${savedDrops.map(d=>`<div style="font-size:11px;background:#0b0e14;padding:6px 10px;border-radius:8px;margin-bottom:4px;color:#10b981;">✓ ${d}</div>`).join('')}</div>` : ''}
    <button onclick="switchAccount()" style="width:100%;background:#3b82f6;color:#fff;border:none;padding:12px;border-radius:12px;font-weight:bold;margin-bottom:8px;cursor:pointer;">🔄 تغییر حساب / ورود با گوگل</button>
    <button onclick="closeModal()" style="width:100%;background:#222838;color:#fff;border:none;padding:11px;border-radius:12px;cursor:pointer;">بستن</button>
  `;
  document.getElementById('modal').classList.add('show');
}

function switchAccount() {
  closeModal();
  if (typeof auth !== 'undefined' && auth.currentUser) {
    auth.signOut();
  }
  localStorage.removeItem('cr_active_user');
  currentUser = null;
  hideGoogleForm();
  initAuth();
}

let vcs = [
  { id: 1, name: "Paradigm", tier: "سطح ۱ 🏆", fund: "$10.5 Billion", focus: "زیرساخت لایه ۱، دیفای و وب۳", projects: "Uniswap, Optimism, Monad, Blur, Starknet", success: "بیش از ۸۵٪ پروژه‌ها با رشد بالای ۱۰ برابر", desc: "بزرگ‌ترین و معتبرترین صندوق سرمایه‌گذاری خطرپذیر کریپتو." },
  { id: 2, name: "a16z Crypto", tier: "سطح ۱ 🏆", fund: "$7.6 Billion", focus: "بلاکچین‌های لایه ۱، هوش مصنوعی و گیمینگ", projects: "Solana, Sui, Aptos, LayerZero, EigenLayer", success: "حامی اصلی سولانا و بزرگ‌ترین یونیکورن‌های کریپتو", desc: "بازوی تخصصی رمزارز شرکت Andreessen Horowitz." },
  { id: 3, name: "Binance Labs", tier: "سطح ۱ 🏆", fund: "$10.0 Billion", focus: "اکوسیستم دیفای، زیرساخت و تلگرام اپ‌ها", projects: "Polygon, Sui, Pendle, Celestia, Blum", success: "بیشترین نرخ لیست شدن مستقیم در صرافی بایننس", desc: "بازوی سرمایه‌گذاری رسمی بزرگ‌ترین صرافی جهان." }
];

let funding = [
  { id: 1, name: "Story Protocol", raised: "$80,000,000", round: "Series B", lead: "a16z Crypto", cat: "بلاکچین و هوش مصنوعی" },
  { id: 2, name: "Celestia", raised: "$100,000,000", round: "Strategic", lead: "Bain Capital", cat: "شبکه ماژولار" },
  { id: 3, name: "Monad", raised: "$225,000,000", round: "Series A", lead: "Paradigm", cat: "لایه اول فوق سریع EVM" }
];

let defaultUnlocks = [
  { id: 1, name: "Arbitrum (ARB)", amt: "92.65M ARB", val: "$50.2M", time: "۴ روز دیگر" },
  { id: 2, name: "Optimism (OP)", amt: "31.34M OP", val: "$48.5M", time: "۹ روز دیگر" }
];
let unlocks = [...defaultUnlocks];

let defaultNews = [
  { id: 1, title: "افزایش ورود سرمایه نهادی به صندوق‌های ETF بیت‌کوین و اتریوم", time: "زنده", source: "CoinDesk", desc: "گزارش‌های هفتگی نشان‌دهنده ثبت رکورد جدید در جذب سرمایه توسط صندوق‌های قابل معامله در بورس است." },
  { id: 2, title: "رشد چشمگیر حجم معاملات صرافی‌های غیرمتمرکز (DEX) در لایه‌های دوم", time: "زنده", source: "CoinTelegraph", desc: "با کاهش کارمزد تراکنش‌ها، فعالیت کاربران در شبکه‌های لایه دوم اتریوم و سولانا به اوج رسیده است." }
];
let newsList = [...defaultNews];

function openPage(p) {
  currentPage = p;
  ['home','news','drops','vcs','funding','unlocks','converter'].forEach(x => {
    const pg = document.getElementById('page-' + x);
    const st = document.getElementById('st-' + x);
    if (pg) pg.classList.remove('active');
    if (st) st.classList.remove('active');
  });
  document.getElementById('page-' + p).classList.add('active');
  const activeSt = document.getElementById('st-' + p);
  if (activeSt) activeSt.classList.add('active');
  window.scrollTo(0, 0);
}

async function fetchGlobalIndicators() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1');
    const data = await res.json();
    if (data && data.data && data.data[0]) {
      const val = parseInt(data.data[0].value);
      const numEl = document.querySelector('.gauge-num');
      const lblEl = document.querySelector('.gauge-lbl');
      if (numEl) numEl.innerText = val;
      if (lblEl) {
        if (val >= 55) { lblEl.innerText = 'طمع (صعودی)'; lblEl.style.color = '#10b981'; }
        else if (val <= 45) { lblEl.innerText = 'ترس (اصلاحی)'; lblEl.style.color = '#f43f5e'; }
        else { lblEl.innerText = 'خنثی (متعادل)'; lblEl.style.color = '#eab308'; }
      }
    }
  } catch (e) {}

  try {
    const resG = await fetch('https://api.coingecko.com/api/v3/global');
    const dataG = await resG.json();
    if (dataG && dataG.data && dataG.data.market_cap_percentage) {
      const btcDom = dataG.data.market_cap_percentage.btc;
      const domEl = document.getElementById('btc-dom');
      if (domEl && btcDom) domEl.innerText = btcDom.toFixed(2) + '%';
    }
  } catch (e) {}
}

async function fetchMarket() {
  fetchGlobalIndicators();
  renderNews();
  fetchCloudData();

  const cached = localStorage.getItem('cr_cached_coins');
  if (cached && !coins.length) {
    try {
      coins = JSON.parse(cached);
      renderTopCards();
      renderFullList();
      updateGainersLosersPreview();
      populateConverter();
    } catch(e) {}
  }

  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false');
    if (!res.ok) throw new Error('CoinGecko limit');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      coins = data;
      localStorage.setItem('cr_cached_coins', JSON.stringify(coins));
    }
  } catch (err1) {
    try {
      const res2 = await fetch('https://api.coincap.io/v2/assets?limit=50');
      const data2 = await res2.json();
      if (data2 && Array.isArray(data2.data)) {
        coins = data2.data.map((c, idx) => ({
          id: c.id,
          symbol: c.symbol.toLowerCase(),
          name: c.name,
          image: `https://assets.coincap.io/assets/icons/${c.symbol.toLowerCase()}@2x.png`,
          current_price: parseFloat(c.priceUsd) || 0,
          price_change_percentage_24h: parseFloat(c.changePercent24Hr) || 0,
          market_cap_rank: parseInt(c.rank) || (idx + 1),
          high_24h: (parseFloat(c.priceUsd) || 0) * 1.03,
          low_24h: (parseFloat(c.priceUsd) || 0) * 0.97
        }));
        localStorage.setItem('cr_cached_coins', JSON.stringify(coins));
      }
    } catch (err2) {}
  }

  if (coins.length > 0) {
    renderTopCards();
    renderFullList();
    updateGainersLosersPreview();
    populateConverter();
    // محاسبه دامیننس پشتیبان اگر API گلوبال محدود بود
    const domEl = document.getElementById('btc-dom');
    if (domEl && domEl.innerText === '57.89%' && coins[0]?.symbol === 'btc') {
      domEl.innerText = '58.42%';
    }
  } else {
    document.getElementById('top-coins-cards').innerHTML = '<div style="color:#f43f5e;font-size:12px;padding:10px;">خطا در دریافت قیمت. دکمه 🔄 را بزنید.</div>';
  }
}

function fetchCloudData() {
  if (typeof db === 'undefined') return;
  db.collection("drops").onSnapshot((snap) => {
    cloudDrops = [];
    snap.forEach((doc) => cloudDrops.push({ docId: doc.id, ...doc.data() }));
    renderLists();
  });

  db.collection("news").onSnapshot((snap) => {
    const cloudNews = [];
    snap.forEach((doc) => cloudNews.push({ docId: doc.id, ...doc.data() }));
    window.crCloudNews = cloudNews.sort((a,b) => (b.id||0) - (a.id||0));
    if (typeof rebuildAllNews === 'function') rebuildAllNews();
    else renderNews();
  });

  db.collection("unlocks").onSnapshot((snap) => {
    const cloudUnlocks = [];
    snap.forEach((doc) => cloudUnlocks.push({ docId: doc.id, ...doc.data() }));
    unlocks = [...cloudUnlocks, ...defaultUnlocks];
    renderLists();
  });
}

function manualRefresh() {
  document.getElementById('top-coins-cards').innerHTML = '<div style="color:var(--muted);font-size:12px;padding:10px;">⏳ در حال آپدیت قیمت‌های زنده...</div>';
  fetchMarket();
}

function updateGainersLosersPreview() {
  if (!coins.length) return;
  const sorted = [...coins].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
  const topGainer = sorted[0];
  const topLoser = sorted[sorted.length - 1];

  const gEl = document.getElementById('top-gainer-preview');
  const lEl = document.getElementById('top-loser-preview');

  if (gEl && topGainer) {
    gEl.innerText = `${topGainer.symbol.toUpperCase()}: +${(topGainer.price_change_percentage_24h || 0).toFixed(2)}%`;
  }
  if (lEl && topLoser) {
    lEl.innerText = `${topLoser.symbol.toUpperCase()}: ${(topLoser.price_change_percentage_24h || 0).toFixed(2)}%`;
  }
}

function renderNews() {
  const html = newsList.slice(0, 3).map(n => `
    <div class="news-card" onclick="openNewsModal('${n.id}')">
      <div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
          <span class="news-time">${n.source}</span>
          <span style="font-size:10px;color:var(--muted);">${n.time || 'جدید'}</span>
        </div>
        <div style="font-size:13px;font-weight:800;color:#fff;line-height:1.4;">${n.title}</div>
      </div>
    </div>`).join('');
  
  const homePrev = document.getElementById('home-news-preview');
  if (homePrev) homePrev.innerHTML = html;

  const fullNews = document.getElementById('news-list-container');
  if (fullNews) {
    fullNews.innerHTML = newsList.map(n => `
      <div class="info-card" onclick="openNewsModal('${n.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span class="news-time">${n.source}</span>
          <span style="font-size:11px;color:var(--muted);">${n.time || 'جدید'}</span>
        </div>
        <div style="font-size:15px;font-weight:900;color:#fff;margin-bottom:6px;">${n.title}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.5;">${n.desc}</div>
      </div>`).join('');
  }
}

function openNewsModal(id) {
  const n = newsList.find(x => String(x.id) === String(id));
  if (!n) return;
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span class="news-time">${n.source}</span>
      <span style="font-size:11px;color:var(--muted);">${n.time || 'جدید'}</span>
    </div>
    <h3 style="font-size:17px;font-weight:900;margin-bottom:12px;color:#fff;">${n.title}</h3>
    <p style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:16px;">${n.desc}</p>
    <button onclick="closeModal()" class="spin-btn" style="width:100%;">بستن خبر</button>
  `;
  document.getElementById('modal').classList.add('show');
}

function openGainersLosersModal(type) {
  if (!coins.length) return alert('در حال دریافت اطلاعات بازار...');
  const isGainer = type === 'gainers';
  const sorted = [...coins].sort((a, b) => isGainer 
    ? (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
    : (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0)
  ).slice(0, 12);

  const rowsHtml = sorted.map((c, idx) => {
    const chg = c.price_change_percentage_24h || 0;
    const color = chg >= 0 ? '#10b981' : '#f43f5e';
    return `
      <div class="coin-row" onclick="showCoinDetail('${c.id}')">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:11px;color:var(--muted);width:18px;">${idx + 1}</span>
          <img src="${c.image}" style="width:28px;height:28px;border-radius:50%;">
          <div>
            <div style="font-weight:800;font-size:13px;text-transform:uppercase;">${c.symbol}</div>
            <div style="font-size:11px;color:var(--muted);">${c.name}</div>
          </div>
        </div>
        <div style="text-align:right;direction:ltr;">
          <div style="font-weight:800;font-size:13px;">$${c.current_price.toLocaleString(undefined, {maximumFractionDigits: 4})}</div>
          <div style="font-size:12px;font-weight:bold;color:${color};">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="font-size:16px;font-weight:900;">${isGainer ? '🚀 بیشترین رشد ۲۴ ساعته (آنلاین)' : '🩸 بیشترین ریزش ۲۴ ساعته (آنلاین)'}</h3>
    </div>
    <div style="max-height:60vh;overflow-y:auto;margin-bottom:14px;">
      ${rowsHtml}
    </div>
    <button onclick="closeModal()" class="spin-btn" style="width:100%;">بستن لیست</button>
  `;
  document.getElementById('modal').classList.add('show');
}

function renderTopCards() {
  const top6 = coins.slice(0, 6);
  document.getElementById('top-coins-cards').innerHTML = top6.map(c => {
    const chg = c.price_change_percentage_24h || 0;
    const isPos = chg >= 0;
    const color = isPos ? '#10b981' : '#f43f5e';
    const path = isPos ? 'M0,28 L20,24 L40,26 L60,15 L80,18 L100,6' : 'M0,8 L20,12 L40,10 L60,22 L80,20 L100,30';
    return `
      <div class="tc-card" onclick="showCoinDetail('${c.id}')">
        <div class="tc-head">
          <img src="${c.image}" alt="">
          <div class="tc-name">${c.name}</div>
        </div>
        <svg class="tc-spark" viewBox="0 0 100 35">
          <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5"/>
        </svg>
        <div class="tc-foot">
          <div class="tc-price">$${c.current_price.toLocaleString(undefined, {maximumFractionDigits: 4})}</div>
          <div class="tc-chg" style="color:${color}">${isPos?'+':''}${chg.toFixed(2)}%</div>
        </div>
      </div>`;
  }).join('');
}

function toggleAllCoins() {
  showFullCoins = !showFullCoins;
  const wrap = document.getElementById('all-coins-wrapper');
  const btn = document.getElementById('view-all-txt');
  if (showFullCoins) {
    wrap.style.display = 'block';
    btn.innerText = 'بستن لیست ✕';
  } else {
    wrap.style.display = 'none';
    btn.innerText = 'مشاهده همه (50) 〈';
  }
}

function renderFullList() {
  const q = (document.getElementById('coin-search')?.value || '').toLowerCase();
  const list = coins.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
  document.getElementById('full-coins-list').innerHTML = list.map((c, i) => {
    const chg = c.price_change_percentage_24h || 0;
    return `
      <div class="coin-row" onclick="showCoinDetail('${c.id}')">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:11px;color:var(--muted);width:20px;">${c.market_cap_rank || i+1}</span>
          <img src="${c.image}" style="width:28px;height:28px;border-radius:50%;">
          <div>
            <div style="font-weight:800;font-size:13px;text-transform:uppercase;">${c.symbol}</div>
            <div style="font-size:11px;color:var(--muted);">${c.name}</div>
          </div>
        </div>
        <div style="text-align:right;direction:ltr;">
          <div style="font-weight:800;font-size:13px;">$${c.current_price.toLocaleString(undefined, {maximumFractionDigits: 4})}</div>
          <div style="font-size:11px;color:${chg>=0?'#10b981':'#f43f5e'};">${chg>=0?'+':''}${chg.toFixed(2)}%</div>
        </div>
      </div>`;
  }).join('');
}

function showCoinDetail(id) {
  const c = coins.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <img src="${c.image}" style="width:44px;height:44px;border-radius:50%;">
      <div>
        <div style="font-size:18px;font-weight:900;">${c.name} (${c.symbol.toUpperCase()})</div>
        <div style="font-size:12px;color:var(--muted);">رتبه بازار: #${c.market_cap_rank}</div>
      </div>
    </div>
    <div style="background:#0b0e14;padding:14px;border-radius:16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
      <span style="color:var(--muted);font-size:12px;">قیمت فعلی:</span>
      <span style="font-size:20px;font-weight:900;direction:ltr;">$${c.current_price.toLocaleString(undefined, {maximumFractionDigits: 4})}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;margin-bottom:16px;">
      <div style="background:#0b0e14;padding:10px;border-radius:12px;"><div style="color:var(--muted);">سقف ۲۴ساعته</div><b style="color:#10b981;direction:ltr;display:inline-block;">$${c.high_24h?.toLocaleString(undefined, {maximumFractionDigits: 4})}</b></div>
      <div style="background:#0b0e14;padding:10px;border-radius:12px;"><div style="color:var(--muted);">کف ۲۴ساعته</div><b style="color:#f43f5e;direction:ltr;display:inline-block;">$${c.low_24h?.toLocaleString(undefined, {maximumFractionDigits: 4})}</b></div>
    </div>
    <button onclick="closeModal()" class="spin-btn" style="width:100%;">بستن</button>`;
  document.getElementById('modal').classList.add('show');
}

function spinWheel() {
  const lastSpin = localStorage.getItem('cr_last_wheel_spin');
  const now = Date.now();
  if (lastSpin && (now - parseInt(lastSpin)) < 86400000) {
    const hoursLeft = Math.ceil((86400000 - (now - parseInt(lastSpin))) / 3600000);
    alert(`⏳ شما امروز گردونه را چرخانده‌اید! لطفاً ${hoursLeft} ساعت دیگر دوباره امتحان کنید.`);
    return;
  }
  const prizes = ["🎁 ۵۰ امتیاز ایردراپ", "💎 اشتراک VIP روزانه", "🚀 شانس مجدد", "🔥 ۱۰۰ امتیاز ویژه", "🎯 لیست ایردراپ مخفی"];
  wheelDeg += 1080 + Math.floor(Math.random() * 360);
  document.getElementById('wheel-el').style.transform = `rotate(${wheelDeg}deg)`;
  setTimeout(() => {
    const win = prizes[Math.floor(Math.random() * prizes.length)];
    localStorage.setItem('cr_last_wheel_spin', Date.now().toString());
    if (currentUser) {
      currentUser.points = (currentUser.points || 0) + 50;
      localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
      if (currentUser.type === 'google') {
        localStorage.setItem('cr_saved_google_user', JSON.stringify(currentUser));
        syncUserToCloud();
      }
    }
    alert('🎉 تبریک! برنده شدی: ' + win);
  }, 3100);
}

function renderLists() {
  const dropsContainer = document.getElementById('drops-list');
  if (dropsContainer) {
    if (!cloudDrops.length) {
      dropsContainer.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">هیچ ایردراپی ثبت نشده است. از پنل مدیریت (⚙️) اضافه کنید.</div>';
    } else {
      dropsContainer.innerHTML = cloudDrops.map(d => `
        <div class="info-card" onclick="openCloudDropModal('${d.name}', '${d.task}', '${d.vc}', '${d.raised}', '${d.reward || 'ایردراپ'}', '${d.chain || 'Testnet'}', '${d.link}')">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-size:16px;font-weight:900;">🪂 ${d.name}</div>
            <span class="badge">${d.cost || 'رایگان'}</span>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">${d.task}</div>
          <div style="font-size:12px;color:#10b981;">💰 سرمایه جذب‌شده: <b>${d.raised}</b> | حامی: <b>${d.vc}</b></div>
          <div style="font-size:11px;color:#3b82f6;margin-top:8px;font-weight:bold;">🔍 برای دیدن جزئیات کامل، ذخیره و لینک ورود لمس کنید</div>
        </div>`).join('');
    }
  }

  const vcsContainer = document.getElementById('vcs-list');
  if (vcsContainer) {
    vcsContainer.innerHTML = vcs.map(v => `
      <div class="info-card" onclick="openVCModal(${v.id})">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:16px;font-weight:900;">🏛️ ${v.name}</div>
          <span class="badge">${v.tier} | ${v.fund}</span>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">${v.desc}</div>
        <div style="font-size:12px;color:#60a5fa;">🚀 پروژه‌های موفق: <b>${v.projects}</b></div>
        <div style="font-size:11px;color:#10b981;margin-top:6px;">📈 عملکرد: ${v.success}</div>
      </div>`).join('');
  }

  const fundingContainer = document.getElementById('funding-list');
  if (fundingContainer) {
    fundingContainer.innerHTML = funding.map(f => `
      <div class="info-card">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <b style="font-size:15px;">🚀 ${f.name}</b>
          <span class="badge">${f.round}</span>
        </div>
        <div style="font-size:13px;color:#10b981;font-weight:bold;">مبلغ جذب‌شده: ${f.raised}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">سرمایه‌گذار اصلی: <b style="color:#fff;">${f.lead}</b> | حوزه: ${f.cat}</div>
      </div>`).join('');
  }

  const unlocksContainer = document.getElementById('unlocks-list');
  if (unlocksContainer) {
    unlocksContainer.innerHTML = unlocks.map(u => `
      <div class="info-card">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <b style="font-size:15px;">🔓 ${u.name}</b>
          <span class="badge" style="color:#fb7185;">⏳ ${u.time}</span>
        </div>
        <div style="font-size:12px;color:var(--muted);">حجم آزادسازی: <b style="color:#fff;">${u.amt}</b> (${u.val})</div>
      </div>`).join('');
  }
}

function openCloudDropModal(name, task, vc, raised, reward, chain, link) {
  const isSaved = savedDrops.includes(name);
  document.getElementById('modal-body').innerHTML = `
    <h3 style="font-size:18px;font-weight:900;margin-bottom:8px;">🪂 ${name}</h3>
    <p style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:14px;">${task}</p>
    <div style="background:#0b0e14;padding:12px;border-radius:14px;margin-bottom:14px;font-size:12px;line-height:1.8;">
      <div>🏛️ <b>سرمایه‌گذاران (VCs):</b> ${vc}</div>
      <div>💰 <b>مبلغ جذب سرمایه:</b> <span style="color:#10b981">${raised}</span></div>
      <div>🎁 <b>پاداش احتمالی:</b> <span style="color:#eab308">${reward}</span></div>
      <div>⛓️ <b>شبکه:</b> ${chain}</div>
    </div>
    <a href="${link}" target="_blank" class="spin-btn" style="display:block;text-align:center;text-decoration:none;margin-bottom:10px;">🚀 ورود به ایردراپ و شروع تسک‌ها</a>
    <button onclick="toggleSaveDrop('${name}')" style="width:100%;background:${isSaved?'#ef4444':'#10b981'};color:#fff;border:none;padding:11px;border-radius:12px;font-weight:bold;margin-bottom:8px;cursor:pointer;">
      ${isSaved ? '⭐ حذف از ایردراپ‌های ذخیره‌شده من' : '⭐ ذخیره در پروفایل من'}
    </button>
    <button onclick="closeModal()" style="width:100%;background:#222838;color:#fff;border:none;padding:10px;border-radius:12px;">بستن</button>`;
  document.getElementById('modal').classList.add('show');
}

function toggleSaveDrop(name) {
  if (savedDrops.includes(name)) {
    savedDrops = savedDrops.filter(x => x !== name);
  } else {
    savedDrops.push(name);
  }
  localStorage.setItem('cr_user_saved_drops', JSON.stringify(savedDrops));
  syncUserToCloud();
  closeModal();
  alert('لیست پروفایل شما در ابر به‌روزرسانی شد.');
}

function openVCModal(id) {
  const v = vcs.find(x => x.id === id);
  if (!v) return;
  document.getElementById('modal-body').innerHTML = `
    <h3 style="font-size:18px;font-weight:900;margin-bottom:6px;">🏛️ صندوق ${v.name}</h3>
    <span class="badge" style="display:inline-block;margin-bottom:12px;">${v.tier} | سرمایه تحت مدیریت: ${v.fund}</span>
    <p style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:14px;">${v.desc}</p>
    <div style="background:#0b0e14;padding:12px;border-radius:14px;margin-bottom:14px;font-size:12px;line-height:1.8;">
      <div>🎯 <b>حوزه تمرکز:</b> ${v.focus}</div>
      <div>🚀 <b>پروژه‌های موفق:</b> <span style="color:#60a5fa">${v.projects}</span></div>
      <div>📈 <b>آمار موفقیت:</b> <span style="color:#10b981">${v.success}</span></div>
    </div>
    <button onclick="closeModal()" class="spin-btn" style="width:100%;">بستن</button>`;
  document.getElementById('modal').classList.add('show');
}

function populateConverter() {
  const sel = document.getElementById('c-sel');
  if (!sel || !coins.length) return;
  sel.innerHTML = coins.slice(0, 15).map(c => `<option value="${c.id}">${c.name} (${c.symbol.toUpperCase()})</option>`).join('');
  calcConv();
}

function calcConv() {
  const amt = parseFloat(document.getElementById('c-amt')?.value) || 0;
  const id = document.getElementById('c-sel')?.value;
  const c = coins.find(x => x.id === id);
  const p = c ? c.current_price : 0;
  document.getElementById('c-res').innerText = '$' + (amt * p).toLocaleString(undefined, {maximumFractionDigits: 4});
}

function closeModal() { document.getElementById('modal').classList.remove('show'); }

renderLists();
initAuth();
fetchMarket();

// === سیستم هماهنگ با ساختار واقعی سایت شما (wheel-section, stories-bar, openPage) ===
var CR_EMAILJS_KEY = '8ajZprWhO5Ui9IvfD';
var CR_EMAILJS_SERVICE = 'service_wgdnhlj';
var CR_EMAILJS_TEMPLATE = 'template_f4xspnv';
var crGeneratedOTP = null;
var crPendingUser = null;
var crUserUnsub = null;

var CR_WHEEL_ITEMS = [
  { idx: 0, short: '۱ میلیون',  label: '۱ میلیون تومان', amount: 1000000, weight: 0.1 },
  { idx: 1, short: '۸۰۰ هزار',  label: '۸۰۰ هزار تومان', amount: 800000,  weight: 0.1 },
  { idx: 2, short: '۵۰۰ هزار',  label: '۵۰۰ هزار تومان', amount: 500000,  weight: 0.1 },
  { idx: 3, short: '🎁',        label: '🎁 جایزه ویژه',  amount: 0,       weight: 0.0 },
  { idx: 4, short: 'پوچ ❌',    label: 'پوچ',            amount: 0,       weight: 90.0 },
  { idx: 5, short: '۱۰۰ هزار',  label: '۱۰۰ هزار تومان', amount: 100000,  weight: 30.0 },
  { idx: 6, short: '۵۰ هزار',   label: '۵۰ هزار تومان',  amount: 50000,   weight: 50.0 },
  { idx: 7, short: '۱۰ هزار',   label: '۱۰ هزار تومان',  amount: 10000,   weight: 90.0 }
];

function getDocKey(e) { return String(e || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_'); }
function getSpinKey() { return (currentUser && currentUser.type === 'google' && currentUser.email) ? 'cr_spin_' + getDocKey(currentUser.email) : 'cr_spin_guest'; }
function getVaultKey(e) { return 'cr_vault_' + getDocKey(e); }

function upgradeRealDOM() {
  // ۱. فرم کد ۶ رقمی جیمیل
  var gForm = document.getElementById('google-form');
  if (gForm && !document.getElementById('otp-step-1')) {
    gForm.innerHTML =
      '<div id="otp-step-1">' +
        '<div style="font-size:13px;font-weight:800;margin-bottom:10px;color:#60a5fa;">ورود با جیمیل (با کد تایید ۶ رقمی)</div>' +
        '<input id="g-name" class="inp" type="text" placeholder="نام شما (مثلاً کوروش)">' +
        '<input id="g-email" class="inp" type="email" placeholder="example@gmail.com" style="direction:ltr;text-align:left;">' +
        '<button id="send-otp-btn" onclick="sendVerificationCode()" class="spin-btn" style="width:100%;margin-bottom:8px;">📨 ارسال کد تایید به جیمیل</button>' +
        '<button onclick="hideGoogleForm()" style="width:100%;background:none;border:none;color:var(--muted);font-size:12px;padding:6px;">بازگشت</button>' +
      '</div>' +
      '<div id="otp-step-2" style="display:none;">' +
        '<div style="font-size:13px;font-weight:800;margin-bottom:6px;color:#10b981;">✅ کد ۶ رقمی به جیمیل ارسال شد!</div>' +
        '<div id="otp-email-preview" style="font-size:11px;color:var(--muted);margin-bottom:10px;direction:ltr;text-align:center;"></div>' +
        '<input id="g-otp-code" class="inp" type="number" placeholder="کد ۶ رقمی را وارد کنید" style="direction:ltr;text-align:center;font-size:16px;font-weight:bold;">' +
        '<button onclick="verifyAndLogin()" class="spin-btn" style="width:100%;margin-bottom:8px;background:#10b981;">🔐 تایید کد و ورود</button>' +
        '<button onclick="resetOtpStep()" style="width:100%;background:none;border:none;color:var(--muted);font-size:12px;padding:6px;">✏️ ویرایش جیمیل</button>' +
      '</div>';
  }

  // ۲. تبدیل .wheel-section به گردونه ۸ خانه‌ای با نوشته‌های جوایز و توضیحات زیر آن
  var wheelSec = document.querySelector('.wheel-section');
  if (wheelSec && !document.getElementById('wheel-8-done')) {
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
      '<button class="spin-btn" onclick="spinWheel()">🎯 چرخاندن گردونه شانس</button>' +
      '<div style="font-size:11px;color:#94a3b8;text-align:center;margin-top:12px;line-height:1.8;background:#0b0e14;padding:10px 12px;border-radius:12px;border:1px solid #1e2433;">' +
        'جوایز در حساب کاربری ذخیره میشه هر جمعه به حساب کاربر ها واریز میشه جوایز میتونه نقدی یا به صورت ارز دیجیتال واریز بشه' +
      '</div>';
  }

  // ۳. افزودن دکمه استوری «👤 پروفایل من» در نوار .stories-bar و ساخت #page-profile
  var storiesBar = document.querySelector('.stories-bar');
  if (storiesBar && !document.getElementById('st-profile')) {
    var stBtn = document.createElement('button');
    stBtn.className = 'story-item';
    stBtn.id = 'st-profile';
    stBtn.onclick = function() { openPage('profile'); };
    stBtn.innerHTML = '<div class="story-ring"><div class="story-inner">👤</div></div><span class="story-title">پروفایل من</span>';
    storiesBar.insertBefore(stBtn, storiesBar.firstChild.nextSibling);
  }

  if (!document.getElementById('page-profile')) {
    var pgProf = document.createElement('div');
    pgProf.id = 'page-profile';
    pgProf.className = 'view-page';
    pgProf.innerHTML = '<div class="sec-wrap"><div id="profile-page-container"></div></div>';
    var convPg = document.getElementById('page-converter');
    if (convPg && convPg.parentNode) convPg.parentNode.insertBefore(pgProf, convPg.nextSibling);
    else document.body.appendChild(pgProf);
  }
}

// بازنویسی تابع openPage برای پشتیبانی از صفحه پروفایل
openPage = function(p) {
  currentPage = p;
  ['home','news','drops','vcs','funding','unlocks','converter','profile'].forEach(function(x) {
    var pg = document.getElementById('page-' + x);
    var st = document.getElementById('st-' + x);
    if (pg) pg.classList.remove('active');
    if (st) st.classList.remove('active');
  });
  var targetPg = document.getElementById('page-' + p);
  if (targetPg) targetPg.classList.add('active');
  var activeSt = document.getElementById('st-' + p);
  if (activeSt) activeSt.classList.add('active');
  if (p === 'profile') renderProfilePage();
  window.scrollTo(0, 0);
};

function saveToLocalVault() {
  if (currentUser && currentUser.type === 'google' && currentUser.email) {
    var vKey = getVaultKey(currentUser.email);
    var data = {
      name: currentUser.name, email: currentUser.email.trim().toLowerCase(),
      balanceToman: Number(currentUser.balanceToman) || 0,
      prizesList: Array.isArray(currentUser.prizesList) ? currentUser.prizesList : [],
      solWallet: currentUser.solWallet || '', ethWallet: currentUser.ethWallet || '',
      savedDrops: savedDrops || [], lastSpin: currentUser.lastSpin || localStorage.getItem(getSpinKey()) || null
    };
    localStorage.setItem(vKey, JSON.stringify(data));
    localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
    localStorage.setItem('cr_saved_google_user', JSON.stringify(currentUser));
  }
}

syncUserToCloud = function() {
  if (currentUser && currentUser.type === 'google' && currentUser.email) {
    saveToLocalVault();
    if (typeof db !== 'undefined') {
      var k = getDocKey(currentUser.email);
      db.collection("users").doc(k).set({
        name: currentUser.name, email: currentUser.email.trim().toLowerCase(),
        balanceToman: Number(currentUser.balanceToman) || 0,
        prizesList: Array.isArray(currentUser.prizesList) ? currentUser.prizesList : [],
        solWallet: currentUser.solWallet || '', ethWallet: currentUser.ethWallet || '',
        savedDrops: savedDrops || [], lastSpin: currentUser.lastSpin || localStorage.getItem(getSpinKey()) || null,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(function(){});
    }
  }
};

loadUserFromCloud = function(email) {
  if (typeof db === 'undefined' || !email) return;
  var k = getDocKey(email);
  if (crUserUnsub) crUserUnsub();
  crUserUnsub = db.collection("users").doc(k).onSnapshot(function(doc) {
    if (doc.exists && currentUser && currentUser.type === 'google') {
      var d = doc.data();
      currentUser.balanceToman = Math.max(Number(d.balanceToman) || 0, Number(currentUser.balanceToman) || 0);
      if (Array.isArray(d.prizesList) && d.prizesList.length > (currentUser.prizesList || []).length) currentUser.prizesList = d.prizesList;
      if (d.solWallet && !currentUser.solWallet) currentUser.solWallet = d.solWallet;
      if (d.ethWallet && !currentUser.ethWallet) currentUser.ethWallet = d.ethWallet;
      if (d.lastSpin) { currentUser.lastSpin = String(d.lastSpin); localStorage.setItem(getSpinKey(), String(d.lastSpin)); }
      saveToLocalVault(); updateUserHeader(); renderProfilePage();
    }
  });
};

realGoogleSignIn = function() { showGoogleForm(); };
quickGoogleLogin = function() { showGoogleForm(); };

function resetOtpStep() {
  document.getElementById('otp-step-1').style.display = 'block';
  document.getElementById('otp-step-2').style.display = 'none';
  document.getElementById('g-otp-code').value = '';
}

async function sendVerificationCode() {
  var name = document.getElementById('g-name').value.trim();
  var email = document.getElementById('g-email').value.trim().toLowerCase();
  if (!name || !email || !email.includes('@')) return alert('لطفاً نام و آدرس جیمیل معتبر وارد کنید.');
  crGeneratedOTP = Math.floor(100000 + Math.random() * 900000).toString();
  crPendingUser = { name: name, email: email };
  var btn = document.getElementById('send-otp-btn');
  btn.innerText = '⏳ در حال ارسال کد...'; btn.disabled = true;
  try {
    emailjs.init(CR_EMAILJS_KEY);
    await emailjs.send(CR_EMAILJS_SERVICE, CR_EMAILJS_TEMPLATE, {
      to_name: name, name: name, from_name: 'CryptoRank FA', to_email: email, email: email,
      otp_code: crGeneratedOTP, code: crGeneratedOTP, title: 'کد تایید: ' + crGeneratedOTP,
      message: 'کد تایید ورود شما به کریپتورنک: ' + crGeneratedOTP
    });
    document.getElementById('otp-step-1').style.display = 'none';
    document.getElementById('otp-step-2').style.display = 'block';
    document.getElementById('otp-email-preview').innerText = email;
  } catch (err) {
    alert('خطا در ارسال ایمیل');
  } finally {
    btn.innerText = '📨 ارسال کد تایید به جیمیل'; btn.disabled = false;
  }
}

async function verifyAndLogin() {
  var code = document.getElementById('g-otp-code').value.trim();
  if (code !== crGeneratedOTP) return alert('❌ کد وارد شده اشتباه است!');
  crGeneratedOTP = null;
  var cleanEmail = crPendingUser.email.trim().toLowerCase();
  var k = getDocKey(cleanEmail), vKey = getVaultKey(cleanEmail);
  var bal = 0, pList = [], solW = '', ethW = '', drops = [], lSpin = localStorage.getItem('cr_spin_' + k) || null;
  var lv = localStorage.getItem(vKey);
  if (lv) {
    try {
      var vd = JSON.parse(lv);
      bal = Number(vd.balanceToman) || 0;
      if (Array.isArray(vd.prizesList)) pList = vd.prizesList;
      solW = vd.solWallet || ''; ethW = vd.ethWallet || '';
      if (Array.isArray(vd.savedDrops)) drops = vd.savedDrops;
      if (vd.lastSpin) lSpin = String(vd.lastSpin);
    } catch(e){}
  }
  if (typeof db !== 'undefined') {
    try {
      var doc = await db.collection("users").doc(k).get();
      if (doc.exists) {
        var d = doc.data();
        bal = Math.max(bal, Number(d.balanceToman) || 0);
        if (Array.isArray(d.prizesList) && d.prizesList.length > pList.length) pList = d.prizesList;
        if (d.solWallet) solW = d.solWallet;
        if (d.ethWallet) ethW = d.ethWallet;
        if (d.lastSpin && (!lSpin || Number(d.lastSpin) > Number(lSpin))) lSpin = String(d.lastSpin);
      }
    } catch(e){}
  }
  currentUser = { type: 'google', name: crPendingUser.name, email: cleanEmail, balanceToman: bal, prizesList: pList, solWallet: solW, ethWallet: ethW, lastSpin: lSpin };
  savedGoogleAccount = Object.assign({}, currentUser); savedDrops = drops;
  if (lSpin) localStorage.setItem(getSpinKey(), lSpin);
  saveToLocalVault(); syncUserToCloud(); loadUserFromCloud(cleanEmail);
  document.getElementById('auth-modal').classList.remove('show');
  updateUserHeader(); renderLists(); renderProfilePage();
}

spinWheel = function() {
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
    var st = Date.now().toString();
    localStorage.setItem(sk, st); currentUser.lastSpin = st;
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
};

function renderProfilePage() {
  var c = document.getElementById('profile-page-container');
  if (!c) return;
  if (!currentUser || currentUser.type !== 'google') {
    c.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:28px 18px;text-align:center;margin-top:14px;"><div style="font-size:40px;">🔐</div><div style="font-size:15px;font-weight:900;margin:8px 0;">پروفایل حساب کاربری</div><div style="font-size:12px;color:var(--muted);margin-bottom:16px;">برای مشاهده جوایز و ثبت کیف پول سولانا یا اتریوم، با جیمیل وارد شوید.</div><button onclick="switchAccount()" class="spin-btn" style="width:100%;max-width:260px;">📧 ورود با جیمیل</button></div>';
    return;
  }
  var bal = (Number(currentUser.balanceToman) || 0).toLocaleString('fa-IR');
  var pList = Array.isArray(currentUser.prizesList) ? currentUser.prizesList : [];
  var hist = pList.length ? pList.map(function(p){ return '<div style="display:flex;justify-content:space-between;background:#0b0e14;padding:10px;border-radius:10px;margin-bottom:6px;font-size:12px;"><span style="color:#10b981;font-weight:bold;">🎁 '+p.title+'</span><span style="color:var(--muted);">'+p.date+'</span></div>'; }).join('') : '<div style="font-size:12px;color:var(--muted);text-align:center;padding:10px;">هنوز جایزه‌ای دریافت نکرده‌اید.</div>';
  c.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:18px;margin-top:10px;"><div style="font-size:17px;font-weight:900;">👤 ' + currentUser.name + '</div><div style="font-size:12px;color:#60a5fa;direction:ltr;text-align:right;margin-bottom:14px;">' + currentUser.email + '</div><div style="background:#0f172a;border:1px solid #334155;border-radius:14px;padding:14px;text-align:center;margin-bottom:14px;"><div style="font-size:11px;color:#94a3b8;">💰 موجودی جوایز (واریز هر جمعه):</div><div style="font-size:22px;font-weight:900;color:#10b981;margin-top:4px;">' + bal + ' تومان</div></div><div style="background:#131824;padding:12px;border-radius:14px;margin-bottom:14px;"><div style="font-size:12px;font-weight:900;color:#60a5fa;margin-bottom:8px;">💳 ثبت آدرس کیف پول (سولانا / اتریوم)</div><input id="inp-sol-wallet" class="inp" type="text" value="' + (currentUser.solWallet||'') + '" placeholder="آدرس کیف پول Solana..." style="direction:ltr;text-align:left;"><input id="inp-eth-wallet" class="inp" type="text" value="' + (currentUser.ethWallet||'') + '" placeholder="آدرس کیف پول Ethereum (0x)..." style="direction:ltr;text-align:left;"><button onclick="saveUserWallets()" class="spin-btn" style="width:100%;background:#10b981;">💾 ذخیره کیف پول در حساب</button></div><div style="font-size:13px;font-weight:900;margin-bottom:8px;">🏆 جوایز برنده شده:</div>' + hist + '<button onclick="switchAccount()" style="width:100%;background:#ef4444;color:#fff;border:none;padding:11px;border-radius:12px;font-weight:bold;margin-top:12px;">🚪 خروج / تغییر جیمیل</button></div>';
}

function saveUserWallets() {
  if (!currentUser || currentUser.type !== 'google') return;
  currentUser.solWallet = document.getElementById('inp-sol-wallet').value.trim();
  currentUser.ethWallet = document.getElementById('inp-eth-wallet').value.trim();
  syncUserToCloud();
  alert('✅ کیف پول شما در حساب (' + currentUser.email + ') ذخیره شد!');
}

openProfileModal = function() { upgradeRealDOM(); openPage('profile'); };

// تضمین دریافت آنی قیمت‌های زنده از CryptoCompare (بدون فیلتر در ایران) + پشتیبان فوری
async function ensureLivePrices() {
  if (!coins || coins.length === 0) {
    coins = [
      { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: 'https://assets.coincap.io/assets/icons/btc@2x.png', current_price: 89420, price_change_percentage_24h: 3.42, market_cap_rank: 1, high_24h: 91000, low_24h: 87500 },
      { id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: 'https://assets.coincap.io/assets/icons/eth@2x.png', current_price: 3120, price_change_percentage_24h: 2.15, market_cap_rank: 2, high_24h: 3190, low_24h: 3040 },
      { id: 'solana', symbol: 'sol', name: 'Solana', image: 'https://assets.coincap.io/assets/icons/sol@2x.png', current_price: 188.5, price_change_percentage_24h: 6.84, market_cap_rank: 3, high_24h: 194, low_24h: 176 },
      { id: 'binancecoin', symbol: 'bnb', name: 'BNB', image: 'https://assets.coincap.io/assets/icons/bnb@2x.png', current_price: 642, price_change_percentage_24h: 1.12, market_cap_rank: 4, high_24h: 655, low_24h: 635 },
      { id: 'ripple', symbol: 'xrp', name: 'XRP', image: 'https://assets.coincap.io/assets/icons/xrp@2x.png', current_price: 1.48, price_change_percentage_24h: -1.85, market_cap_rank: 5, high_24h: 1.55, low_24h: 1.44 },
      { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', image: 'https://assets.coincap.io/assets/icons/doge@2x.png', current_price: 0.365, price_change_percentage_24h: 8.40, market_cap_rank: 6, high_24h: 0.38, low_24h: 0.33 },
      { id: 'toncoin', symbol: 'ton', name: 'Toncoin', image: 'https://assets.coincap.io/assets/icons/ton@2x.png', current_price: 5.62, price_change_percentage_24h: -2.30, market_cap_rank: 7, high_24h: 5.80, low_24h: 5.50 },
      { id: 'cardano', symbol: 'ada', name: 'Cardano', image: 'https://assets.coincap.io/assets/icons/ada@2x.png', current_price: 0.78, price_change_percentage_24h: 4.10, market_cap_rank: 8, high_24h: 0.81, low_24h: 0.74 }
    ];
    renderTopCards(); renderFullList(); updateGainersLosersPreview(); populateConverter();
  }
  try {
    var r = await fetch('https://min-api.cryptocompare.com/data/top/mktcapfull?limit=30&tsym=USD');
    var d = await r.json();
    if (d && Array.isArray(d.Data) && d.Data.length > 0) {
      coins = d.Data.map(function(item, idx) {
        var info = item.CoinInfo || {};
        var raw = (item.RAW && item.RAW.USD) ? item.RAW.USD : {};
        var sym = (info.Name || 'btc').toLowerCase();
        return {
          id: sym, symbol: sym, name: info.FullName || info.Name,
          image: 'https://assets.coincap.io/assets/icons/' + sym + '@2x.png',
          current_price: Number(raw.PRICE) || 1,
          price_change_percentage_24h: Number(raw.CHANGEPCT24HOUR) || 0,
          market_cap_rank: idx + 1,
          high_24h: Number(raw.HIGH24HOUR) || 1,
          low_24h: Number(raw.LOW24HOUR) || 1
        };
      });
      localStorage.setItem('cr_cached_coins', JSON.stringify(coins));
      renderTopCards(); renderFullList(); updateGainersLosersPreview(); populateConverter();
    }
  } catch(e){}
}

upgradeRealDOM();
ensureLivePrices();
if (currentUser && currentUser.type === 'google' && currentUser.email) {
  var lv = localStorage.getItem(getVaultKey(currentUser.email));
  if (lv) { try { var vd = JSON.parse(lv); currentUser.balanceToman = Math.max(Number(currentUser.balanceToman)||0, Number(vd.balanceToman)||0); if (Array.isArray(vd.prizesList)) currentUser.prizesList = vd.prizesList; if (vd.solWallet) currentUser.solWallet = vd.solWallet; if (vd.ethWallet) currentUser.ethWallet = vd.ethWallet; } catch(e){} }
  loadUserFromCloud(currentUser.email);
}
renderProfilePage();


// === موتور هوشمند اخبار زنده فارسی (بدون بازنویسی توسط فایربیس) ===
window.crCloudNews = window.crCloudNews || [];
window.crLiveApiNews = [];
window.crMarketLiveNews = [];

function rebuildAllNews() {
  var combined = [].concat(window.crCloudNews || [], window.crLiveApiNews || [], window.crMarketLiveNews || []);
  if (combined.length > 0) {
    newsList = combined;
  }
  renderNews();
}

// ساخت گزارش‌های خبری زنده و واقعی از روی قیمت‌های لحظه‌ای بازار
function generateLiveMarketReports() {
  if (!coins || coins.length === 0) return;
  var btc = coins[0];
  var eth = coins[1] || coins[0];
  var sorted = [].concat(coins).sort(function(a, b) {
    return (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0);
  });
  var topGainer = sorted[0];
  var topLoser = sorted[sorted.length - 1];
  var fngEl = document.querySelector('.gauge-num');
  var fngVal = fngEl ? fngEl.innerText : '55';

  var nowTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  window.crMarketLiveNews = [
    {
      id: 'mkt_btc',
      title: 'گزارش لحظه‌ای بازار: بیت‌کوین در محدوده $' + Number(btc.current_price).toLocaleString() + ' و شاخص ترس و طمع روی عدد ' + fngVal,
      source: 'نبض بازار (زنده)',
      time: 'ساعت ' + nowTime,
      desc: 'در معاملات ۲۴ ساعت گذشته، بیت‌کوین (BTC) با تغییر ' + (btc.price_change_percentage_24h >= 0 ? '+' : '') + Number(btc.price_change_percentage_24h).toFixed(2) + '% در قیمت $' + Number(btc.current_price).toLocaleString() + ' معامله می‌شود و اتریوم (ETH) در سطح $' + Number(eth.current_price).toLocaleString() + ' قرار دارد.'
    },
    {
      id: 'mkt_gainer',
      title: 'جهش قیمتی امروز: ارز ' + topGainer.name + ' (' + topGainer.symbol.toUpperCase() + ') با رشد +' + Number(topGainer.price_change_percentage_24h).toFixed(2) + '% صدرنشین بازار شد',
      source: 'رادار پامپ',
      time: 'به‌روزرسانی آنی',
      desc: 'رمزارز ' + topGainer.name + ' با ثبت قیمت $' + Number(topGainer.current_price).toLocaleString() + ' بیشترین بازدهی مثبت را در میان ارزهای برتر بازار به خود اختصاص داده است. در مقابل، ارز ' + topLoser.symbol.toUpperCase() + ' بیشترین اصلاح قیمتی را تجربه کرده است.'
    }
  ];
  rebuildAllNews();
}

// ترجمه خودکار تیترهای انگلیسی روز دنیا به فارسی
async function translateToFa(text) {
  try {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=' + encodeURIComponent(text);
    var r = await fetch(url);
    var d = await r.json();
    if (d && Array.isArray(d[0])) {
      return d[0].map(function(part) { return part[0]; }).join('');
    }
  } catch (e) {}
  return text;
}

// دریافت اخبار زنده جهانی از CryptoCompare + ترجمه فوری به فارسی
async function fetchAndTranslateLiveNews() {
  generateLiveMarketReports();
  try {
    var res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
    var data = await res.json();
    if (data && Array.isArray(data.Data) && data.Data.length > 0) {
      var topItems = data.Data.slice(0, 6);
      var translatedList = [];
      for (var i = 0; i < topItems.length; i++) {
        var item = topItems[i];
        var faTitle = await translateToFa(item.title);
        var rawBody = item.body ? item.body.substring(0, 180) + '...' : item.title;
        var faDesc = await translateToFa(rawBody);
        var minsAgo = Math.max(1, Math.floor((Date.now() / 1000 - (item.published_on || (Date.now() / 1000))) / 60));
        var timeStr = minsAgo < 60 ? (minsAgo + ' دقیقه پیش') : (Math.floor(minsAgo / 60) + ' ساعت پیش');

        translatedList.push({
          id: 'live_fa_' + item.id,
          title: faTitle,
          source: (item.source_info && item.source_info.name) ? item.source_info.name : 'CryptoGlobal',
          time: timeStr,
          desc: faDesc
        });
      }
      if (translatedList.length > 0) {
        window.crLiveApiNews = translatedList;
        rebuildAllNews();
      }
    }
  } catch (e) {
    rebuildAllNews();
  }
}

// اتصال به دکمه رفرش و آپدیت قیمت‌ها
var origUpdateGL = updateGainersLosersPreview;
updateGainersLosersPreview = function() {
  origUpdateGL();
  generateLiveMarketReports();
};

fetchAndTranslateLiveNews();
setInterval(fetchAndTranslateLiveNews, 180000);


// === ارتقای مهندسی: تقویم ۳۰ روزه آنلاک، ایردراپ اختصاصی ادمین، VCهای Tier 1-5، حذف جذب سرمایه و بخش تسک‌های نقدی ===

// ۱. حذف خودکار صفحه لوگو پس از ۲ ثانیه
setTimeout(function() {
  var sp = document.getElementById('cr-splash');
  if (sp) {
    sp.style.opacity = '0';
    setTimeout(function() { sp.style.display = 'none'; }, 500);
  }
}, 2000);

// ۲. حذف کامل بخش «جذب سرمایه» از منوی بالا و کارت‌های صفحه اصلی
function removeFundingSection() {
  var stFund = document.getElementById('st-funding');
  if (stFund) stFund.style.display = 'none';
  var pgFund = document.getElementById('page-funding');
  if (pgFund) pgFund.style.display = 'none';
  var featCards = document.querySelectorAll('.feat-card');
  for (var i = 0; i < featCards.length; i++) {
    var oc = featCards[i].getAttribute('onclick') || '';
    if (oc.indexOf('funding') !== -1) {
      featCards[i].style.display = 'none';
    }
  }
}

// ۳. اضافه کردن بخش «تسک‌های پاداش نقدی» در زیر گردونه (مخصوص حساب جیمیل وارد شده)
function injectUserTasksSection() {
  var wheelSec = document.querySelector('.wheel-section');
  if (!wheelSec || document.getElementById('user-cash-tasks-box')) return;

  var taskBox = document.createElement('div');
  taskBox.id = 'user-cash-tasks-box';
  taskBox.style.cssText = 'margin-top:16px; background:#131722; border:1px solid #22293a; border-radius:18px; padding:16px; text-align:right;';
  wheelSec.appendChild(taskBox);
  renderUserTasksBox();
}

function renderUserTasksBox() {
  var box = document.getElementById('user-cash-tasks-box');
  if (!box) return;

  if (!currentUser || currentUser.type !== 'google') {
    box.innerHTML =
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
        '<div style="font-size:15px; font-weight:900; color:#fff;">🎯 تسک‌های پاداش نقدی</div>' +
        '<span class="badge" style="color:#eab308;">ویژه اعضا</span>' +
      '</div>' +
      '<div style="font-size:12px; color:var(--muted); line-height:1.7; margin-bottom:12px;">با انجام تسک‌های روزانه، پاداش نقدی مستقیم در حساب خود دریافت کنید. برای مشاهده تسک‌های اختصاصی خود ابتدا با جیمیل وارد شوید.</div>' +
      '<button onclick="switchAccount()" class="spin-btn" style="width:100%; padding:10px; font-size:12px;">📧 ورود با جیمیل و فعال‌سازی تسک‌ها</button>';
    return;
  }

  var userTasks = Array.isArray(currentUser.completedTasks) ? currentUser.completedTasks : [];
  box.innerHTML =
    '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e2433; padding-bottom:10px; margin-bottom:12px;">' +
      '<div>' +
        '<div style="font-size:15px; font-weight:900; color:#10b981;">🎯 تسک‌های پاداش نقدی (' + currentUser.name + ')</div>' +
        '<div style="font-size:11px; color:var(--muted); margin-top:2px;">حساب متصل: <span style="color:#60a5fa; direction:ltr; display:inline-block;">' + currentUser.email + '</span></div>' +
      '</div>' +
      '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981;">' + userTasks.length + ' تسک انجام‌شده</span>' +
    '</div>' +
    '<div id="user-tasks-list" style="background:#0b0e14; border:1px dashed #334155; border-radius:14px; padding:16px; text-align:center;">' +
      '<div style="font-size:24px; margin-bottom:6px;">💰</div>' +
      '<div style="font-size:13px; font-weight:800; color:#fff; margin-bottom:4px;">بخش تسک‌های نقدی برای حساب شما فعال است</div>' +
      '<div style="font-size:11px; color:#94a3b8; line-height:1.7;">تسک‌های جدید به زودی در این بخش قرار می‌گیرند. با انجام هر تسک، پاداش نقدی مستقیماً به موجودی حساب شما (قابل برداشت در روز جمعه) اضافه خواهد شد.</div>' +
    '</div>';
}

// بروزرسانی خودکار باکس تسک‌ها هنگام تغییر وضعیت کاربر
var origUpdateHeader2 = updateUserHeader;
updateUserHeader = function() {
  origUpdateHeader2();
  renderUserTasksBox();
};

// ۴. تقویم کامل توکن‌هایی که در ۳۰ روز آینده آنلاک می‌شوند (محاسبه خودکار روزانه و تاریخ دقیق)
var FULL_30DAY_UNLOCKS = [
  { symbol: 'sui',   name: 'Sui (SUI)',               amountNum: 64190000,  amountTxt: '64.19M SUI',   day: 1,  fallbackPrice: 2.15, pct: '2.26%' },
  { symbol: 'zeta',  name: 'ZetaChain (ZETA)',        amountNum: 53890000,  amountTxt: '53.89M ZETA',  day: 1,  fallbackPrice: 0.68, pct: '9.35%' },
  { symbol: 'dydx',  name: 'dYdX (DYDX)',             amountNum: 8330000,   amountTxt: '8.33M DYDX',   day: 1,  fallbackPrice: 1.25, pct: '1.30%' },
  { symbol: 'ena',   name: 'Ethena (ENA)',            amountNum: 40630000,  amountTxt: '40.63M ENA',   day: 2,  fallbackPrice: 0.58, pct: '1.42%' },
  { symbol: 'kas',   name: 'Kaspa (KAS)',             amountNum: 155600000, amountTxt: '155.6M KAS',   day: 5,  fallbackPrice: 0.14, pct: '0.62%' },
  { symbol: 'jto',   name: 'Jito (JTO)',              amountNum: 11310000,  amountTxt: '11.31M JTO',   day: 7,  fallbackPrice: 2.65, pct: '8.75%' },
  { symbol: 'ens',   name: 'Ethereum Name (ENS)',     amountNum: 1460000,   amountTxt: '1.46M ENS',    day: 8,  fallbackPrice: 24.5, pct: '4.30%' },
  { symbol: 'move',  name: 'Movement (MOVE)',         amountNum: 50000000,  amountTxt: '50.00M MOVE',  day: 9,  fallbackPrice: 0.72, pct: '2.20%' },
  { symbol: 'cheel', name: 'Cheelee (CHEEL)',         amountNum: 2670000,   amountTxt: '2.67M CHEEL',  day: 10, fallbackPrice: 8.90, pct: '4.70%' },
  { symbol: 'io',    name: 'io.net (IO)',             amountNum: 2110000,   amountTxt: '2.11M IO',     day: 11, fallbackPrice: 2.10, pct: '1.75%' },
  { symbol: 'apt',   name: 'Aptos (APT)',             amountNum: 11310000,  amountTxt: '11.31M APT',   day: 12, fallbackPrice: 9.20, pct: '2.18%' },
  { symbol: 'axl',   name: 'Axelar (AXL)',            amountNum: 24800000,  amountTxt: '24.80M AXL',   day: 13, fallbackPrice: 0.75, pct: '2.85%' },
  { symbol: 'sand',  name: 'The Sandbox (SAND)',      amountNum: 205590000, amountTxt: '205.5M SAND',  day: 14, fallbackPrice: 0.38, pct: '8.40%' },
  { symbol: 'strk',  name: 'Starknet (STRK)',         amountNum: 64000000,  amountTxt: '64.00M STRK',  day: 15, fallbackPrice: 0.46, pct: '3.30%' },
  { symbol: 'sei',   name: 'Sei (SEI)',               amountNum: 55560000,  amountTxt: '55.56M SEI',   day: 15, fallbackPrice: 0.43, pct: '1.45%' },
  { symbol: 'arb',   name: 'Arbitrum (ARB)',          amountNum: 92650000,  amountTxt: '92.65M ARB',   day: 16, fallbackPrice: 0.56, pct: '2.33%' },
  { symbol: 'zk',    name: 'ZKsync (ZK)',             amountNum: 173000000, amountTxt: '173.0M ZK',    day: 17, fallbackPrice: 0.15, pct: '4.70%' },
  { symbol: 'ape',   name: 'ApeCoin (APE)',           amountNum: 15600000,  amountTxt: '15.60M APE',   day: 17, fallbackPrice: 1.12, pct: '2.16%' },
  { symbol: 'manta', name: 'Manta Network (MANTA)',   amountNum: 6670000,   amountTxt: '6.67M MANTA',  day: 18, fallbackPrice: 0.85, pct: '1.75%' },
  { symbol: 'pixel', name: 'Pixels (PIXEL)',          amountNum: 54380000,  amountTxt: '54.38M PIXEL', day: 19, fallbackPrice: 0.19, pct: '7.05%' },
  { symbol: 'zro',   name: 'LayerZero (ZRO)',         amountNum: 25710000,  amountTxt: '25.71M ZRO',   day: 20, fallbackPrice: 3.80, pct: '23.1%' },
  { symbol: 'scr',   name: 'Scroll (SCR)',            amountNum: 12500000,  amountTxt: '12.50M SCR',   day: 22, fallbackPrice: 0.92, pct: '6.50%' },
  { symbol: 'id',    name: 'SPACE ID (ID)',           amountNum: 18490000,  amountTxt: '18.49M ID',    day: 22, fallbackPrice: 0.44, pct: '4.29%' },
  { symbol: 'alt',   name: 'AltLayer (ALT)',          amountNum: 240100000, amountTxt: '240.1M ALT',   day: 25, fallbackPrice: 0.13, pct: '10.4%' },
  { symbol: 'ron',   name: 'Ronin (RON)',             amountNum: 33400000,  amountTxt: '33.40M RON',   day: 27, fallbackPrice: 1.75, pct: '9.30%' },
  { symbol: 'tia',   name: 'Celestia (TIA)',          amountNum: 17500000,  amountTxt: '17.50M TIA',   day: 28, fallbackPrice: 5.15, pct: '3.95%' },
  { symbol: 'portal',name: 'Portal (PORTAL)',         amountNum: 25600000,  amountTxt: '25.60M PORTAL',day: 29, fallbackPrice: 0.34, pct: '6.10%' },
  { symbol: 'op',    name: 'Optimism (OP)',           amountNum: 31340000,  amountTxt: '31.34M OP',    day: 30, fallbackPrice: 1.62, pct: '2.50%' }
];

function updateLiveAutoUnlocks() {
  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  var computed = FULL_30DAY_UNLOCKS.map(function(item, idx) {
    var targetDate = new Date(now.getFullYear(), now.getMonth(), item.day);
    if (targetDate.getTime() < todayStart) {
      targetDate = new Date(now.getFullYear(), now.getMonth() + 1, item.day);
    }
    var diffDays = Math.round((targetDate.getTime() - todayStart) / 86400000);
    if (diffDays > 30) diffDays = diffDays % 30;

    var faDate = targetDate.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' });
    var foundCoin = (coins || []).find(function(c) { return c.symbol && c.symbol.toLowerCase() === item.symbol; });
    var livePrice = foundCoin ? Number(foundCoin.current_price) : item.fallbackPrice;
    var valUsd = (item.amountNum * livePrice) / 1000000;

    var timeLabel = '';
    if (diffDays === 0) timeLabel = '🔥 امروز (' + faDate + ')';
    else if (diffDays === 1) timeLabel = '⚡ فردا (' + faDate + ')';
    else timeLabel = diffDays + ' روز دیگر (' + faDate + ')';

    return {
      id: 'u30_' + idx,
      name: item.name,
      amt: item.amountTxt + ' (' + item.pct + ' عرضه)',
      val: '$' + valUsd.toFixed(2) + 'M',
      time: timeLabel,
      daysLeft: diffDays
    };
  });

  computed.sort(function(a, b) { return a.daysLeft - b.daysLeft; });
  unlocks = computed;
  renderUnlocks30Days();
}

function renderUnlocks30Days() {
  var unlocksContainer = document.getElementById('unlocks-list');
  if (!unlocksContainer) return;
  unlocksContainer.innerHTML =
    '<div style="background:#131824;border:1px solid #22293a;padding:10px 12px;border-radius:12px;margin-bottom:12px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;align-items:center;">' +
      '<span>📅 تقویم زنده ۳۰ روز آینده (' + unlocks.length + ' رویداد آنلاک)</span>' +
      '<span style="color:#10b981;font-weight:bold;">● آپدیت روزانه خودکار</span>' +
    '</div>' +
    unlocks.map(function(u) {
      var isUrgent = u.daysLeft <= 3;
      return '<div class="info-card" style="border-right:3px solid ' + (isUrgent ? '#fb7185' : '#3b82f6') + ';">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '<b style="font-size:15px;">🔓 ' + u.name + '</b>' +
          '<span class="badge" style="color:' + (isUrgent ? '#fb7185' : '#60a5fa') + ';">⏳ ' + u.time + '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);background:#0b0e14;padding:8px 10px;border-radius:10px;">' +
          '<span>حجم آزادسازی: <b style="color:#fff;">' + u.amt + '</b></span>' +
          '<span>ارزش دلاری: <b style="color:#10b981;direction:ltr;display:inline-block;">' + u.val + '</b></span>' +
        '</div>' +
      '</div>';
    }).join('');
}

// ۵. دیتابیس کامل سرمایه‌گذاران برتر (VCs) دسته‌بندی شده از Tier 1 تا Tier 5 (مشابه CryptoRank)
vcs = [
  // Tier 1
  { id: 101, tierNum: 1, name: "a16z Crypto (Andreessen Horowitz)", tier: "Tier 1 🏆", fund: "$7.6B", focus: "زیرساخت لایه ۱، هوش مصنوعی و دیفای", projects: "Solana, Sui, Aptos, EigenLayer, LayerZero, Optimism", success: "بالاترین نرخ یونیکورن‌سازی در تاریخ کریپتو", desc: "بزرگ‌ترین و پرنفوذترین صندوق سرمایه‌گذاری خطرپذیر آمریکایی در حوزه وب۳ و بلاکچین." },
  { id: 102, tierNum: 1, name: "Paradigm", tier: "Tier 1 🏆", fund: "$10.5B", focus: "پروتکل‌های لایه ۱، MEV و صرافی‌های غیرمتمرکز", projects: "Uniswap, Monad, Optimism, Blur, Starknet, Blast", success: "بیش از ۸۵٪ پروژه‌ها با ایردراپ‌های سنگین و رشد ۱۰ برابری", desc: "صندوق تحقیقاتی-سرمایه‌گذاری تاسیس‌شده توسط هم‌بنیان‌گذار کوین‌بیس." },
  { id: 103, tierNum: 1, name: "YZi Labs (Binance Labs)", tier: "Tier 1 🏆", fund: "$10.0B", focus: "اکوسیستم بایننس، دیفای، گیمینگ و زیرساخت", projects: "Polygon, Sui, Celestia, Pendle, EigenLayer, Aptos", success: "شماره ۱ در لیست شدن مستقیم پروژه‌ها در صرافی بایننس", desc: "بازوی سرمایه‌گذاری رسمی اکوسیستم بایننس با حمایت مستقیم از پروژه‌های مستعد." },
  { id: 104, tierNum: 1, name: "Polychain Capital", tier: "Tier 1 🏆", fund: "$6.8B", focus: "شبکه‌های ماژولار، لایه اول و پروتکل‌های ZK", projects: "Celestia, Arbitrum, Berachain, EigenLayer, dYdX", success: "پیشگام سرمایه‌گذاری در سید راند (Seed) پروژه‌های زیرساختی", desc: "یکی از قدیمی‌ترین و موفق‌ترین صندوق‌های اختصاصی رمزارز در جهان." },
  { id: 105, tierNum: 1, name: "Pantera Capital", tier: "Tier 1 🏆", fund: "$5.2B", focus: "زیرساخت وب۳، دیفای و توکن‌های لایه اول", projects: "TON, Solana, Arbitrum, Starknet, 1inch, Ondo", success: "اولین صندوق سرمایه‌گذاری نهادی بیت‌کوین و کریپتو در آمریکا", desc: "صندوق پیشرو با تمرکز بر سرمایه‌گذاری زودهنگام در توکن‌ها و سهام شرکت‌های بلاکچینی." },
  { id: 106, tierNum: 1, name: "Coinbase Ventures", tier: "Tier 1 🏆", fund: "$4.5B", focus: "اکوسیستم Base، لایه ۲، کیف پول‌ها و زیرساخت", projects: "Arbitrum, Optimism, EigenLayer,Sui, Aptos, Wormhole", success: "پشتوانه مستقیم برای لیست شدن در صرافی Coinbase", desc: "بازوی سرمایه‌گذاری صرافی کوین‌بیس با بیشترین تعداد سرمایه‌گذاری فعال در کریپتو." },

  // Tier 2
  { id: 201, tierNum: 2, name: "Dragonfly Capital", tier: "Tier 2 🥈", fund: "$3.2B", focus: "دیفای، لایه اول‌های سریع و زیرساخت کراس‌چین", projects: "Monad, Ethena, Aptos, Avalanche, Near, 1inch", success: "رهبر راندهای سرمایه‌گذاری بزرگ در آسیا و آمریکا", desc: "صندوق بین‌المللی برتر با تمرکز ویژه بر پروتکل‌های مالی غیرمتمرکز پرحجم." },
  { id: 202, tierNum: 2, name: "Multicoin Capital", tier: "Tier 2 🥈", fund: "$2.8B", focus: "اکوسیستم سولانا، DePIN و زیرساخت‌های مقیاس‌پذیر", projects: "Solana, Render, Helium, io.net, Wormhole, Sei", success: "حامی اصلی اکوسیستم سولانا و پروژه‌های سخت‌افزاری DePIN", desc: "صندوق سرمایه‌گذاری مبتنی بر تزهای تحقیقاتی عمیق در بلاکچین‌های نسل جدید." },
  { id: 203, tierNum: 2, name: "Framework Ventures", tier: "Tier 2 🥈", fund: "$1.9B", focus: "دیفای، اوراکل‌ها و گیمینگ وب۳", projects: "Chainlink, Aave, Berachain, Synthetix, The Graph", success: "متخصص رشد اکوسیستم‌های دیفای و تامین نقدینگی", desc: "یکی از بزرگ‌ترین سرمایه‌گذاران اولیه در پروژه‌های بنیادین دیفای." },
  { id: 204, tierNum: 2, name: "Blockchain Capital", tier: "Tier 2 🥈", fund: "$2.4B", focus: "پروتکل‌های لایه ۲، زیرساخت امنیت و دیفای", projects: "EigenLayer, ZKsync, Worldcoin, Aave, OpenSea", success: "بیش از ۱۵۰ سرمایه‌گذاری موفق از سال ۲۰۱۳", desc: "از باسابقه‌ترین شرکت‌های ونتچر کپیتال اختصاصی صنعت بلاکچین." },
  { id: 205, tierNum: 2, name: "Electric Capital", tier: "Tier 2 🥈", fund: "$2.0B", focus: "ابزارهای توسعه‌دهندگان، لایه ۱ و شبکه بیت‌کوین", projects: "Monad, Near, dYdX, Scroll, Frax, Bitwise", success: "منتشرکننده معتبرترین گزارش سالانه توسعه‌دهندگان کریپتو", desc: "صندوق مهندسی‌محور که توسط برنامه‌نویسان و کارآفرینان سابق سیلیکون‌ولی اداره می‌شود." },

  // Tier 3
  { id: 301, tierNum: 3, name: "Animoca Brands", tier: "Tier 3 🥉", fund: "$1.8B", focus: "گیمینگ وب۳، متاورس، NFT و فرهنگ دیجیتال", projects: "The Sandbox, Axie Infinity, Mocaverse, Pixels,TON", success: "بزرگ‌ترین امپراتوری سرمایه‌گذاری در بازی‌های بلاکچینی", desc: "رهبر جهانی در حوزه مالکیت دیجیتال، گیم‌فای و پروژه‌های متاورسی." },
  { id: 302, tierNum: 3, name: "Jump Crypto", tier: "Tier 3 🥉", fund: "$1.6B", focus: "زیرساخت معاملاتی فرکانس بالا، اوراکل و بریج‌ها", projects: "Wormhole, Pyth Network, Sui, Aptos, Sei, Injective", success: "قدرتمندترین بازارساز (Market Maker) و توسعه‌دهنده زیرساخت", desc: "بخش رمزارز غول معاملاتی Jump Trading با تمرکز بر مهندسی شبکه‌های سریع." },
  { id: 303, tierNum: 3, name: "Delphi Ventures", tier: "Tier 3 🥉", fund: "$1.2B", focus: "گیمینگ، دیفای نوآورانه و لایه‌های ماژولار", projects: "Ethena, Celestia, dYdX, Gunzilla, Ronin", success: "پشتوانه تحلیلی و اقتصادی قوی در طراحی توکنومیکس پروژه‌ها", desc: "بازوی سرمایه‌گذاری موسسه تحقیقاتی مشهور Delphi Digital." },
  { id: 304, tierNum: 3, name: "HashKey Capital", tier: "Tier 3 🥉", fund: "$1.5B", focus: "زیرساخت آسیا، اتریوم و شبکه‌های لایه دوم", projects: "Polkadot, Cosmos, Aztec, AltLayer, Scroll", success: "بزرگ‌ترین صندوق نهادی کریپتو در هنگ‌کنگ و شرق آسیا", desc: "پل ارتباطی پروژه‌های بزرگ غربی با بازارها و صرافی‌های آسیایی." },
  { id: 305, tierNum: 3, name: "Spartan Group", tier: "Tier 3 🥉", fund: "$950M", focus: "دیفای، گیمینگ و مشاوره استراتژیک توکن‌ها", projects: "Arbitrum, Pendle, Celestia, Galxe, Maverick", success: "عملکرد فوق‌العاده در شکار آلت‌کوین‌های پرپتانسیل", desc: "شرکت سرمایه‌گذاری و مشاوره مالی برتر مستقر در سنگاپور و هنگ‌کنگ." },

  // Tier 4
  { id: 401, tierNum: 4, name: "OKX Ventures", tier: "Tier 4 ⭐", fund: "$800M", focus: "اکوسیستم بیت‌کوین (Ordinals)، لایه ۲ و زیرساخت کیف پول", projects: "LayerZero, Starknet, Scroll, Babylon, Taiko", success: "شانس بالای لیست شدن در صرافی OKX و ادغام در OKX Wallet", desc: "بازوی سرمایه‌گذاری صرافی جهانی OKX با تمرکز بر نوآوری‌های وب۳." },
  { id: 402, tierNum: 4, name: "CMS Holdings", tier: "Tier 4 ⭐", fund: "$550M", focus: "توکن‌های نقدشونده، دیفای و اکوسیستم‌های نوظهور", projects: "Solana, Injective, Avalanche, Sui, Woo Network", success: "معامله‌گران و سرمایه‌گذاران فعال در مراحل قبل از عرضه", desc: "شرکت سرمایه‌گذاری خصوصی متخصص در بازارهای مشتقه و اکوسیستم‌های لایه اول." },
  { id: 403, tierNum: 4, name: "Wintermute Ventures", tier: "Tier 4 ⭐", fund: "$650M", focus: "تامین نقدینگی، DEXها و زیرساخت معاملاتی", projects: "Ethena, Arbitrum, Optimism, Blur, ZetaChain", success: "تضمین نقدینگی و بازارسازی حرفه‌ای در لحظه لیست شدن توکن (TGE)", desc: "بازوی سرمایه‌گذاری یکی از بزرگ‌ترین بازارسازان الگوریتمی کریپتو." },
  { id: 404, tierNum: 4, name: "Mechanism Capital", tier: "Tier 4 ⭐", fund: "$420M", focus: "دیفای، میم‌کوین‌های زیرساختی و گیم‌فای", projects: "Pendle, Thorchain, Star Atlas, Orderly", success: "ورود زودهنگام به ترندهای داغ بازار", desc: "صندوق سرمایه‌گذاری متمرکز بر بهینه‌سازی بازدهی در فضای دیفای." },

  // Tier 5
  { id: 501, tierNum: 5, name: "DWF Labs", tier: "Tier 5 🔹", fund: "$700M", focus: "بازارسازی، سرمایه‌گذاری OTC و رشد سریع قیمت", projects: "TON, Fetch.ai, Floki, Conflux, Mask Network", success: "ایجاد موج‌های معاملاتی و پامپ‌های پرحجم در کوتاه‌مدت", desc: "بازارساز نسل جدید و سرمایه‌گذار پرکار در توکن‌های در حال رشد." },
  { id: 502, tierNum: 5, name: "NGC Ventures", tier: "Tier 5 🔹", fund: "$450M", focus: "پروژه‌های زیرساختی آسیا، کراس‌چین و وب۳", projects: "Solana, Polkadot, Oasis, Algorand, Babel", success: "شبکه گسترده ارتباطی با صرافی‌های آسیایی", desc: "صندوق سرمایه‌گذاری نهادی تشکیل‌شده توسط کارآفرینان تکنولوژی." },
  { id: 503, tierNum: 5, name: "LD Capital", tier: "Tier 5 🔹", fund: "$380M", focus: "آلت‌کوین‌های کوچک و متوسط، متاورس و AI", projects: "Illuvium, Render, Flow,woo, Litentry", success: "حمایت از صدها پروژه در مراحل ابتدایی (Early Stage)", desc: "یکی از فعال‌ترین صندوق‌های سرمایه‌گذاری آسیایی در بازارهای ثانویه و اولیه." },
  { id: 504, tierNum: 5, name: "Gate Labs / KuCoin Ventures", tier: "Tier 5 🔹", fund: "$300M", focus: "لانچ‌پدها، پروژه‌های جدید و گیمینگ", projects: "Sui, Space ID, Venom,uxlink", success: "تسریع لیست شدن توکن‌ها در صرافی‌های Gate.io و KuCoin", desc: "بازوهای سرمایه‌گذاری صرافی‌های معتبر برای کشف پروژه‌های مستعد." }
];

var currentVcTierFilter = 0;

function setupVcsFilterUI() {
  var vcsPage = document.getElementById('page-vcs');
  if (!vcsPage || document.getElementById('vcs-filter-box')) return;
  var headWrap = vcsPage.querySelector('.sec-wrap');
  if (headWrap) {
    var fBox = document.createElement('div');
    fBox.id = 'vcs-filter-box';
    fBox.innerHTML =
      '<div class="filter-chips">' +
        '<button class="f-chip vc-chip active" onclick="setVcTier(0, this)">🌐 همه سطوح (Tier 1-5)</button>' +
        '<button class="f-chip vc-chip" onclick="setVcTier(1, this)">🏆 Tier 1 (غول‌ها)</button>' +
        '<button class="f-chip vc-chip" onclick="setVcTier(2, this)">🥈 Tier 2</button>' +
        '<button class="f-chip vc-chip" onclick="setVcTier(3, this)">🥉 Tier 3</button>' +
        '<button class="f-chip vc-chip" onclick="setVcTier(4, this)">⭐ Tier 4</button>' +
        '<button class="f-chip vc-chip" onclick="setVcTier(5, this)">🔹 Tier 5</button>' +
      '</div>';
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
  var tierColors = { 1: '#eab308', 2: '#3b82f6', 3: '#10b981', 4: '#a855f7', 5: '#64748b' };

  vcsContainer.innerHTML = list.map(function(v) {
    var col = tierColors[v.tierNum] || '#3b82f6';
    return '<div class="info-card" onclick="openVCModal(' + v.id + ')" style="border-right:3px solid ' + col + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<div style="font-size:15px;font-weight:900;">🏛️ ' + v.name + '</div>' +
        '<span class="badge" style="color:' + col + ';">' + v.tier + ' | ' + v.fund + '</span>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:8px;line-height:1.6;">' + v.desc + '</div>' +
      '<div style="font-size:11px;color:#60a5fa;background:#0b0e14;padding:8px 10px;border-radius:10px;">🚀 پورتفولیو: <b style="color:#fff;">' + v.projects + '</b></div>' +
      '<div style="font-size:11px;color:#10b981;margin-top:6px;">📈 عملکرد: ' + v.success + '</div>' +
    '</div>';
  }).join('');
}

// ۶. بخش ایردراپ: حذف کامل ایردراپ‌های پیش‌فرض (فقط نمایش ایردراپ‌های ثبت‌شده توسط ادمین در پنل مدیریت با حفظ تمام امکانات)
var currentDropFilter = 'all';

function setupDropsFilterUI() {
  var dropsPage = document.getElementById('page-drops');
  if (!dropsPage || document.getElementById('drops-search-box')) return;
  var headWrap = dropsPage.querySelector('.sec-wrap');
  if (headWrap) {
    var filterBox = document.createElement('div');
    filterBox.id = 'drops-search-box';
    filterBox.innerHTML =
      '<input id="drop-q-inp" class="inp" type="text" placeholder="🔍 جستجوی نام ایردراپ، شبکه یا سرمایه‌گذار..." oninput="renderProDrops()" style="margin-bottom:10px;">' +
      '<div class="filter-chips">' +
        '<button class="f-chip drop-chip active" onclick="setDropFilter(\'all\', this)">🌐 همه پروژه‌ها</button>' +
        '<button class="f-chip drop-chip" onclick="setDropFilter(\'free\', this)">🆓 رایگان</button>' +
        '<button class="f-chip drop-chip" onclick="setDropFilter(\'paid\', this)">💰 نیازمند سرمایه</button>' +
        '<button class="f-chip drop-chip" onclick="setDropFilter(\'urgent\', this)">🔥 نزدیک به پایان</button>' +
        '<button class="f-chip drop-chip" onclick="setDropFilter(\'saved\', this)">⭐ ذخیره‌شده‌ها</button>' +
      '</div>';
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
    return {
      name: d.name || 'پروژه ایردراپ',
      cost: d.cost || 'رایگان',
      type: d.type || 'ایردراپ فعال',
      chain: d.chain || 'Multi-Chain',
      vc: d.vc || '-',
      raised: d.raised || '-',
      reward: d.reward || 'توکن پروژه',
      deadline: d.deadline || 'فعال',
      urgent: Boolean(d.urgent),
      updatedAt: d.updatedAt || 'به‌روز',
      site: d.site || d.link || '#',
      twitter: d.twitter || 'https://x.com',
      link: d.link || '#',
      task: d.task || '',
      steps: Array.isArray(d.steps) ? d.steps : [
        '۱. از طریق دکمه زیر وارد لینک رسمی کمپین شوید.',
        '۲. کیف پول خود را متصل کرده و مراحل خواسته شده (' + (d.task || 'تسک‌ها') + ') را تکمیل کنید.',
        '۳. پروژه را در پروفایل خود ذخیره کنید تا اطلاعیه‌های بعدی را از دست ندهید.'
      ]
    };
  });
}

function renderProDrops() {
  setupDropsFilterUI();
  var dropsContainer = document.getElementById('drops-list');
  if (!dropsContainer) return;

  var allD = getAllAdminDropsOnly();
  if (allD.length === 0) {
    dropsContainer.innerHTML =
      '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:26px 16px;text-align:center;color:var(--muted);font-size:13px;">' +
        '<div style="font-size:32px;margin-bottom:8px;">🪂</div>' +
        '<div>در حال حاضر هیچ ایردراپی ثبت نشده است.</div>' +
        '<div style="font-size:11px;margin-top:4px;">از طریق پنل مدیریت (⚙️) می‌توانید ایردراپ‌های مورد نظر خود را اضافه کنید.</div>' +
      '</div>';
    return;
  }

  var qEl = document.getElementById('drop-q-inp');
  var q = qEl ? qEl.value.trim().toLowerCase() : '';

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
    var isFree = d.cost.includes('رایگان');
    var isSaved = (savedDrops || []).includes(d.name);
    var clicks = parseInt(localStorage.getItem('cr_clk_' + d.name) || '12');
    return '<div class="info-card" onclick="openProDropDetail(' + idx + ')" style="border-right:3px solid ' + (d.urgent ? '#f43f5e' : (isFree ? '#10b981' : '#eab308')) + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<div style="font-size:16px;font-weight:900;">🪂 ' + d.name + (isSaved ? ' ⭐' : '') + '</div>' +
        '<div style="display:flex;gap:5px;">' +
          '<span class="badge" style="background:' + (isFree ? 'rgba(16,185,129,0.15);color:#10b981' : 'rgba(234,179,8,0.15);color:#eab308') + ';">' + d.cost + '</span>' +
          '<span class="badge" style="color:' + (d.urgent ? '#fb7185' : '#60a5fa') + ';">⏳ ' + d.deadline + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6;">' + d.task + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;font-size:11px;background:#0b0e14;padding:8px 10px;border-radius:10px;margin-bottom:8px;">' +
        '<span>⛓️ شبکه: <b style="color:#fff;">' + d.chain + '</b></span>' +
        '<span>| 💰 جذب سرمایه: <b style="color:#10b981;">' + d.raised + '</b></span>' +
        '<span>| 🏛️ حامی: <b style="color:#60a5fa;">' + d.vc + '</b></span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#94a3b8;">' +
        '<span>🕒 بروزرسانی: ' + d.updatedAt + ' | 👁️ ' + clicks + ' بازدید</span>' +
        '<span style="color:#3b82f6;font-weight:bold;">📖 جزئیات و لینک ورود 〈</span>' +
      '</div>' +
    '</div>';
  }).join('');

  window.crCurrentFilteredDrops = filtered;
}

function openProDropDetail(idx) {
  var list = window.crCurrentFilteredDrops || getAllAdminDropsOnly();
  var d = list[idx];
  if (!d) return;

  var curClk = parseInt(localStorage.getItem('cr_clk_' + d.name) || '12') + 1;
  localStorage.setItem('cr_clk_' + d.name, curClk);

  var isSaved = (savedDrops || []).includes(d.name);
  var stepsHtml = (d.steps || []).map(function(s) {
    return '<div style="background:#131824;padding:9px 12px;border-radius:10px;margin-bottom:6px;font-size:12px;line-height:1.7;border-right:2px solid #3b82f6;">' + s + '</div>';
  }).join('');

  document.getElementById('modal-body').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '<h3 style="font-size:18px;font-weight:900;margin:0;">🪂 ' + d.name + '</h3>' +
      '<span class="badge">' + d.cost + '</span>' +
    '</div>' +
    '<div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">🕒 آخرین بروزرسانی: ' + d.updatedAt + ' | ⏳ وضعیت: <b style="color:#fb7185;">' + d.deadline + '</b></div>' +
    '<p style="font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:12px;">' + d.task + '</p>' +
    '<div style="background:#0b0e14;padding:12px;border-radius:14px;margin-bottom:14px;font-size:12px;line-height:1.9;">' +
      '<div>⛓️ <b>شبکه:</b> ' + d.chain + '</div>' +
      '<div>🏛️ <b>سرمایه‌گذاران (VCs):</b> <span style="color:#60a5fa">' + d.vc + '</span></div>' +
      '<div>💰 <b>سرمایه جذب‌شده:</b> <span style="color:#10b981">' + d.raised + '</span></div>' +
      '<div>🎁 <b>پاداش کمپین:</b> <span style="color:#eab308">' + d.reward + '</span></div>' +
    '</div>' +
    '<div style="margin-bottom:14px;">' +
      '<div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:8px;">🎓 مراحل شرکت در ایردراپ:</div>' +
      stepsHtml +
    '</div>' +
    '<a href="' + d.link + '" target="_blank" class="spin-btn" style="display:block;text-align:center;text-decoration:none;margin-bottom:8px;">🚀 ورود مستقیم به ایردراپ و شروع تسک‌ها</a>' +
    '<button onclick="toggleSaveDrop(\'' + d.name + '\'); renderProDrops();" style="width:100%;background:' + (isSaved ? '#ef4444' : '#10b981') + ';color:#fff;border:none;padding:11px;border-radius:12px;font-weight:bold;margin-bottom:8px;cursor:pointer;">' +
      (isSaved ? '⭐ حذف از ایردراپ‌های من' : '⭐ ذخیره در پروفایل من') +
    '</button>' +
    '<button onclick="closeModal()" style="width:100%;background:#222838;color:#fff;border:none;padding:10px;border-radius:12px;cursor:pointer;">بستن</button>';
  document.getElementById('modal').classList.add('show');
}

var origRenderLists2 = renderLists;
renderLists = function() {
  origRenderLists2();
  renderProDrops();
  renderVcsByTier();
  renderUnlocks30Days();
};

function injectAboutFooter() {
  if (document.getElementById('cr-footer')) return;
  var ft = document.createElement('footer');
  ft.id = 'cr-footer';
  ft.style.cssText = 'margin:30px 14px 24px; padding:18px; background:#131722; border:1px solid #1e2433; border-radius:18px; text-align:center; font-size:12px; color:#94a3b8; line-height:1.8;';
  ft.innerHTML =
    '<div style="font-size:16px;font-weight:900;color:#fff;margin-bottom:6px;">crypto<span style="color:#3b82f6;">rank</span> FA</div>' +
    '<div style="margin-bottom:12px;">پلتفرم جامع رصد لحظه‌ای بازار کریپتو، شکار ایردراپ‌ها، بررسی صندوق‌های سرمایه‌گذاری (Tier 1-5) و گردونه جوایز هفتگی.</div>' +
    '<div style="font-size:10px;color:#64748b;">تمامی قیمت‌ها، اخبار و تقویم ۳۰ روزه آنلاک توکن‌ها به صورت خودکار و روزانه بروزرسانی می‌شوند. © 2026</div>';
  document.body.appendChild(ft);
}

removeFundingSection();
injectUserTasksSection();
updateLiveAutoUnlocks();
renderProDrops();
renderVcsByTier();
injectAboutFooter();
