// Product Expiry Tracker - simplified: removed import/export, improved UI behaviors
(() => {
  const storageKey = 'expiry_products_v2';
  const LANG_KEY = 'expiry_lang';

  const I18N = {
    uk: {
      title: "Трекер термінів придатності",
      add: "Додати",
      checkNow: "Перевірити",
      listTitle: "Список товарів",
      namePlaceholder: "Назва товару",
      langLabel: "Мова:",
      footer: "Працює локально. Дозвольте сповіщення.",
      expired: "Прострочено",
      daysLeft: (n)=> n===0 ? "Сьогодні" : `${n} дн.`,
      filters: { all: 'Всі', expired: 'Прострочені', soon: 'Скоро' },
      deleteConfirm: 'Ви впевнені, що хочете видалити?'
    },
    de: {
      title: "Ablaufdatum Tracker",
      add: "Hinzufügen",
      checkNow: "Prüfen",
      listTitle: "Produktliste",
      namePlaceholder: "Produktname",
      langLabel: "Sprache:",
      footer: "Lokal im Browser. Erlaube Benachrichtigungen.",
      expired: "Abgelaufen",
      daysLeft: (n)=> n===0 ? "Heute" : `${n} Tg.`,
      filters: { all: 'Alle', expired: 'Abgelaufen', soon: 'Bald' },
      deleteConfirm: 'Sind Sie sicher, dass Sie löschen möchten?'
    }
  };

  const el = {
    title: document.getElementById('title'),
    langSelect: document.getElementById('langSelect'),
    productName: document.getElementById('productName'),
    expiryDate: document.getElementById('expiryDate'),
    reminderDays: document.getElementById('reminderDays'),
    addBtn: document.getElementById('addBtn'),
    checkBtn: document.getElementById('checkBtn'),
    productList: document.getElementById('productList'),
    footerText: document.getElementById('footerText'),
    search: document.getElementById('search'),
    filters: Array.from(document.querySelectorAll('.filter')),
    listTitle: document.getElementById('listTitle')
  };

  let lang = localStorage.getItem(LANG_KEY) || 'uk';
  el.langSelect.value = lang;
  let activeFilter = 'all';

  function t(key, ...args){
    const v = I18N[lang][key];
    return typeof v === 'function' ? v(...args) : (v || key);
  }

  function loadProducts(){ try { const raw = localStorage.getItem(storageKey); return raw ? JSON.parse(raw) : []; } catch(e){ console.error(e); return []; } }
  function saveProducts(items){ localStorage.setItem(storageKey, JSON.stringify(items)); }

  function addProduct(name, dateStr, reminderDays){
    if(!name || !dateStr) return;
    const items = loadProducts();
    items.push({ id: Date.now()+Math.random().toString(16).slice(2), name, expiry: dateStr, reminderDays: Number(reminderDays||0), createdAt: new Date().toISOString(), notified: false });
    saveProducts(items); render();
  }

  function deleteProduct(id){
    if(!confirm(t('deleteConfirm'))) return;
    let items = loadProducts(); items = items.filter(it => it.id !== id); saveProducts(items); render();
  }

  function daysUntil(dateStr){
    const today = new Date(); const target = new Date(dateStr + 'T00:00:00');
    const diff = target.setHours(0,0,0,0) - new Date(today.setHours(0,0,0,0));
    return Math.round(diff / (1000*60*60*24));
  }

  function showNotification(title, body){
    if(window.Notification && Notification.permission === 'granted'){
      try { new Notification(title, { body }); } catch(e){ /* graceful fallback */ }
    }
  }

  function checkExpirations(manual=false){
    const items = loadProducts();
    const nowExpired = [], nowSoon = [];
    items.forEach(it=>{
      const d = daysUntil(it.expiry);
      if(d <= 0 && !it.notified){ nowExpired.push(it); it.notified = true; }
      else if(it.reminderDays>0 && d <= it.reminderDays && !it.notified){ nowSoon.push(it); it.notified = true; }
    });
    if(nowExpired.length||nowSoon.length){ saveProducts(items); nowExpired.forEach(it=>showNotification(t('expired')+': '+it.name, it.expiry)); nowSoon.forEach(it=>showNotification(t('listTitle')+': '+it.name, it.expiry)); }
    else if(manual){ /* optional small feedback */ }
    render();
  }

  function render(){
    // UI texts
    el.title.textContent = t('title');
    el.addBtn.textContent = t('add') || 'Додати';
    el.checkBtn.textContent = t('checkNow');
    el.footerText.textContent = t('footer');
    el.productName.placeholder = t('namePlaceholder');
    el.listTitle.textContent = t('listTitle');

    const q = (el.search.value || '').trim().toLowerCase();
    const items = loadProducts().sort((a,b)=> new Date(a.expiry) - new Date(b.expiry));
    el.productList.innerHTML = '';

    const filtered = items.filter(it=>{
      const d = daysUntil(it.expiry);
      if(activeFilter === 'expired' && d>0) return false;
      if(activeFilter === 'soon' && !(d>0 && d<=3)) return false;
      if(q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    });

    if(filtered.length===0){
      const li = document.createElement('li'); li.className='product-item';
      li.textContent = '—';
      el.productList.appendChild(li);
      return;
    }

    filtered.forEach(it=>{
      const li=document.createElement('li'); li.className='product-item';
      const top=document.createElement('div'); top.className='item-top';
      const left=document.createElement('div');
      const name=document.createElement('div'); name.className='name'; name.textContent=it.name;
      const date=document.createElement('div'); date.className='date'; date.textContent=it.expiry;
      left.appendChild(name); left.appendChild(date);
      top.appendChild(left);

      const badge=document.createElement('div');
      const d=daysUntil(it.expiry);
      const b=document.createElement('span'); b.className='badge';
      if(d<=0){ b.classList.add('expired'); b.textContent=t('expired'); }
      else if(d<=3){ b.classList.add('warning'); b.textContent=t('daysLeft', d); }
      else { b.classList.add('ok'); b.textContent=t('daysLeft', d); }
      badge.appendChild(b);
      top.appendChild(badge);
      li.appendChild(top);

      const actions=document.createElement('div'); actions.className='item-actions';
      const resetBtn=document.createElement('button'); resetBtn.textContent='🔁'; resetBtn.title='Reset'; resetBtn.onclick=()=>{ it.notified=false; const arr=loadProducts(); const found=arr.find(x=>x.id===it.id); if(found){ found.notified=false; saveProducts(arr); render(); } };
      const delBtn=document.createElement('button'); delBtn.textContent='✖'; delBtn.title='Delete'; delBtn.onclick=()=> deleteProduct(it.id);
      actions.appendChild(resetBtn); actions.appendChild(delBtn);
      li.appendChild(actions);

      el.productList.appendChild(li);
    });
  }

  // Events
  el.addBtn.addEventListener('click', ()=>{ addProduct(el.productName.value.trim(), el.expiryDate.value, el.reminderDays.value); el.productName.value=''; el.expiryDate.value=''; });
  el.checkBtn.addEventListener('click', ()=> checkExpirations(true));
  el.search.addEventListener('input', ()=> render());
  el.filters.forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      el.filters.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      render();
    });
  });

  el.langSelect.addEventListener('change', (e)=>{ lang = e.target.value; localStorage.setItem(LANG_KEY, lang); render(); });

  // request permission & initial
  if('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  render();
  setInterval(()=> checkExpirations(false), 60*1000);
  checkExpirations(false);
})();
