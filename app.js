let coins = [];
let showFullCoins = false;
let currentPage = 'home';
let wheelDeg = 0;
let cloudDrops = [];

let currentUser = JSON.parse(localStorage.getItem('cr_active_user')) || null;
let savedGoogleAccount = JSON.parse(localStorage.getItem('cr_saved_google_user')) || null;
let savedDrops = JSON.parse(localStorage.getItem('cr_user_saved_drops')) || [];

function initAuth() {
  if (currentUser && currentUser.type === 'google') {
    updateUserHeader();
    return;
  }
  const authModal = document.getElementById('auth-modal');
  if (authModal) authModal.classList.add('show');

  if (savedGoogleAccount) {
    const savedBtn = document.getElementById('saved-google-btn');
    const savedTxt = document.getElementById('saved-google-txt');
    if (savedBtn && savedTxt) {
      savedBtn.style.display = 'flex';
      savedTxt.innerText = `ورود خودکار با ${savedGoogleAccount.name} (${savedGoogleAccount.email})`;
    }
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
}

function quickGoogleLogin() {
  if (!savedGoogleAccount) return;
  currentUser = savedGoogleAccount;
  localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
  document.getElementById('auth-modal').classList.remove('show');
  updateUserHeader();
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
    avatarEl.innerText = currentUser.name.charAt(0).toUpperCase();
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
      <div style="width:60px;height:60px;border-radius:50%;background:${isG?'#10b981':'#3b82f6'};color:#fff;font-size:26px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">
        ${isG ? currentUser.name.charAt(0).toUpperCase() : '🕶️'}
      </div>
      <div style="font-size:18px;font-weight:900;">${currentUser.name}</div>
      <div style="font-size:12px;color:var(--muted);direction:ltr;">${currentUser.email}</div>
    </div>
    <div style="background:#0b0e14;padding:14px;border-radius:16px;margin-bottom:16px;font-size:12px;line-height:2;">
      <div>🔐 <b>نوع حساب:</b> <span style="color:${isG?'#10b981':'#eab308'}">${isG ? 'حساب گوگل (ذخیره دائمی)' : 'ورود ناشناس'}</span></div>
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
  localStorage.removeItem('cr_active_user');
  currentUser = null;
  hideGoogleForm();
  initAuth();
}

let vcs = [
  { id: 1, name: "Paradigm", tier: "سطح ۱ 🏆", fund: "$10.5 Billion", focus: "زیرساخت لایه ۱، دیفای و وب۳", projects: "Uniswap, Optimism, Monad, Blur, Starknet", success: "بیش از ۸۵٪ پروژه‌ها با رشد بالای ۱۰ برابر", desc: "بزرگ‌ترین و معتبرترین صندوق سرمایه‌گذاری خطرپذیر کریپتو." },
  { id: 2, name: "a16z Crypto", tier: "سطح ۱ 🏆", fund: "$7.6 Billion", focus: "بلاکچین‌های لایه ۱، هوش مصنوعی و گیمینگ", projects: "Solana, Sui, Aptos, LayerZero, EigenLayer", success: "حامی اصلی سولانا و بزرگ‌ترین یونیکورن‌های کریپتو", desc: "بازوی تخصصی رمزارز شرکت Andreessen Horowitz." }
];

let funding = [
  { id: 1, name: "Story Protocol", raised: "$80,000,000", round: "Series B", lead: "a16z Crypto", cat: "بلاکچین و هوش مصنوعی" },
  { id: 2, name: "Celestia", raised: "$100,000,000", round: "Strategic", lead: "Bain Capital", cat: "شبکه ماژولار" }
];

let unlocks = [
  { id: 1, name: "Arbitrum (ARB)", amt: "92.65M ARB", val: "$50.2M", time: "۴ روز دیگر" },
  { id: 2, name: "Optimism (OP)", amt: "31.34M OP", val: "$48.5M", time: "۹ روز دیگر" }
];

let newsList = [
  { id: 1, title: "تایید صندوق قابل معامله (ETF) سولانا توسط کمیسیون بورس آمریکا", time: "۱۰ دقیقه پیش", source: "CoinDesk", desc: "تحلیلگران پیش‌بینی می‌کنند با تایید این صندوق، ورود سرمایه عظیمی به اکوسیستم سولانا سرازیر شود." },
  { id: 2, title: "رشد ۳۰ درصدی کارمزد شبکه اتریوم همزمان با افزایش حجم معاملات دیفای", time: "۴۵ دقیقه پیش", source: "CoinTelegraph", desc: "فعالیت در لایه اول اتریوم به شدت افزایش یافته و توکن‌سوزی به بالاترین میزان ماهانه رسیده است." }
];
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

async function fetchMarket() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false');
    coins = await res.json();
    renderTopCards();
    renderFullList();
    updateGainersLosersPreview();
    renderNews();
    fetchCloudDrops();
    populateConverter();
  } catch (e) {
    document.getElementById('top-coins-cards').innerHTML = '<div style="color:#f43f5e;font-size:12px;padding:10px;">خطا در دریافت قیمت‌ها.</div>';
  }
}

function fetchCloudDrops() {
  db.collection("drops").onSnapshot((querySnapshot) => {
    cloudDrops = [];
    querySnapshot.forEach((doc) => {
      cloudDrops.push({ docId: doc.id, ...doc.data() });
    });
    renderLists();
  });
}

function manualRefresh() {
  document.getElementById('top-coins-cards').innerHTML = '<div style="color:var(--muted);font-size:12px;padding:10px;">⏳ در حال آپدیت قیمت‌ها...</div>';
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
  const html = newsList.slice(0, 2).map(n => `
    <div class="news-card" onclick="openNewsModal(${n.id})">
      <div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
          <span class="news-time">${n.source}</span>
          <span style="font-size:10px;color:var(--muted);">${n.time}</span>
        </div>
        <div style="font-size:13px;font-weight:800;color:#fff;line-height:1.4;">${n.title}</div>
      </div>
    </div>`).join('');
  
  const homePrev = document.getElementById('home-news-preview');
  if (homePrev) homePrev.innerHTML = html;

  const fullNews = document.getElementById('news-list-container');
  if (fullNews) {
    fullNews.innerHTML = newsList.map(n => `
      <div class="info-card" onclick="openNewsModal(${n.id})">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span class="news-time">${n.source}</span>
          <span style="font-size:11px;color:var(--muted);">${n.time}</span>
        </div>
        <div style="font-size:15px;font-weight:900;color:#fff;margin-bottom:6px;">${n.title}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.5;">${n.desc}</div>
      </div>`).join('');
  }
}

function openNewsModal(id) {
  const n = newsList.find(x => x.id === id);
  if (!n) return;
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span class="news-time">${n.source}</span>
      <span style="font-size:11px;color:var(--muted);">${n.time}</span>
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
          <div style="font-weight:800;font-size:13px;">$${c.current_price.toLocaleString()}</div>
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
          <div class="tc-price">$${c.current_price.toLocaleString()}</div>
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
          <div style="font-weight:800;font-size:13px;">$${c.current_price.toLocaleString()}</div>
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
      <span style="font-size:20px;font-weight:900;direction:ltr;">$${c.current_price.toLocaleString()}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;margin-bottom:16px;">
      <div style="background:#0b0e14;padding:10px;border-radius:12px;"><div style="color:var(--muted);">سقف ۲۴ساعته</div><b style="color:#10b981;direction:ltr;display:inline-block;">$${c.high_24h?.toLocaleString()}</b></div>
      <div style="background:#0b0e14;padding:10px;border-radius:12px;"><div style="color:var(--muted);">کف ۲۴ساعته</div><b style="color:#f43f5e;direction:ltr;display:inline-block;">$${c.low_24h?.toLocaleString()}</b></div>
    </div>
    <button onclick="closeModal()" class="spin-btn" style="width:100%;">بستن</button>`;
  document.getElementById('modal').classList.add('show');
}

function spinWheel() {
  const prizes = ["🎁 ۵۰ امتیاز ایردراپ", "💎 اشتراک VIP روزانه", "🚀 شانس مجدد", "🔥 ۱۰۰ امتیاز ویژه", "🎯 لیست ایردراپ مخفی"];
  wheelDeg += 1080 + Math.floor(Math.random() * 360);
  document.getElementById('wheel-el').style.transform = `rotate(${wheelDeg}deg)`;
  setTimeout(() => {
    const win = prizes[Math.floor(Math.random() * prizes.length)];
    if (currentUser && currentUser.type === 'google') {
      currentUser.points = (currentUser.points || 0) + 50;
      localStorage.setItem('cr_active_user', JSON.stringify(currentUser));
      localStorage.setItem('cr_saved_google_user', JSON.stringify(currentUser));
    }
    alert('🎉 تبریک! برنده شدی: ' + win);
  }, 3100);
}

function renderLists() {
  const dropsContainer = document.getElementById('drops-list');
  if (dropsContainer) {
    if (!cloudDrops.length) {
      dropsContainer.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">در حال دریافت ایردراپ‌های ابری...</div>';
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
  closeModal();
  alert('لیست پروفایل شما به‌روزرسانی شد.');
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

initAuth();
fetchMarket();
