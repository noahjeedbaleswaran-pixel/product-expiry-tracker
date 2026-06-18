// Product Expiry Tracker - app.js
// Зберігає товари в localStorage, підтримка i18n (uk/de), фільтри, нагадування за N днів, експорт/імпорт
(() => {
  const storageKey = 'expiry_products_v1';
  const LANG_KEY = 'expiry_lang';

  const I18N = {
    uk: {
      title: "Трекер термінів придатності",
      add: "Додати",
      checkNow: "Перевірити зараз",
      export: "Експорт JSON",
      import: "Імпорт JSON",
      listTitle: "Список товарів",
      namePlaceholder: "Назва товару",
      langLabel: "Мова:",
      footer: "Працює локально у вашому браузері. Дозвольте сповіщення, щоб отримувати desktop-повідомлення.",
      expired: "Прострочено",
      daysLeft: (n)=> n===0 ? "Сьогодні" : `${n} дн.`,
      deletedConfirm: "Товар видалено",
      importSuccess: "Імпорт виконано",
      invalidJson: "Невірний JSON-файл",
      filters: {
        all: 'Всі',
        expired: 'Прострочені',
        soon: 'Скоро'
      },
      deleteConfirm: 'Ви впевнені, що хочете видалити?'
    },
    de: {
      title: "Ablaufdatum Tracker",
      add: "Hinzufügen",
      checkNow: "Jetzt prüfen",
      export: "Export JSON",
      import: "Import JSON",
      listTitle: "Produktliste",
      namePlaceholder: "Produktname",
      langLabel: "Sprache:",
      footer: "Lokal im Browser. Erlaube Benachrichtigungen, um Desktop-Benachrichtigungen zu erhalten.",
      expired: "Abgelaufen",
      daysLeft: (n)=> n===0 ? "Heute" : `${n} Tg.`,
      filters: { all: 'Alle', expired: 'Abgelaufen', soon: 'Bald' },
      importSuccess: "Import erfolgreich",
      invalidJson: "Ungültige JSON-Datei",
      deleteConfirm: 'Sind Sie sicher, dass Sie löschen möchten?'
    }
  };

  const el = {
    title: document.getElementById('title'),
    langSelect: document.getElementById('langSelect'),
    langLabel: document.getElementById('langLabel'),
    productName: document.getElementById('productName'),
    expiryDate: document.getElementById('expiryDate'),
    reminderDays: document.getElementById('reminderDays'),
    addBtn: document.getElementById('addBtn'),
    checkBtn: document.getElementById('checkBtn'),
    productList: document.getElementById('productList'),
    footerText: document.getElementById('footerText'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    listTitle: document.getElementById('listTitle')
  };

  let lang = localStorage.getItem(LANG_KEY) || 'uk';
  el.langSelect.value = lang;

  function t(path, ...args){
    const keys = path.split('.');
    let v = I18N[lang];
    for(const k of keys){ v = v && v[k]; }
    if(typeof v === 'function') return v(...args);
    return v || path;
  }

  function loadProducts(){ try { const raw = localStorage.getItem(storageKey); return raw ? JSON.parse(raw) : []; } catch(e){ console.error(e); return []; } }
  function saveProducts(items){ localStorage.setItem(storageKey, JSON.stringify(items)); }

  function addProduct(name, dateStr, reminderDays){
    if(!name || !dateStr) return;
    const items = loadProducts();
    items.push({ id: Date.now()+Math.random().toString(16).slice(2), name, expiry: dateStr, reminderDays: Number(reminderDays||0), createdAt: new Date().toISOString(), notified: false });
    saveProducts(items);
    render();
  }

  function deleteProduct(id){
    if(!confirm(t('deleteConfirm'))) return;
    let items = loadProducts(); items = items.filter(it => it.id !== id); saveProducts(items); render();
  }

  function daysUntil(dateStr){ const today = new Date(); const target = new Date(dateStr + 'T00:00:00'); const diff = target.setHours(0,0,0,0) - new Date(today.setHours(0,0,0,0)); return Math.round(diff / (1000*60*60*24)); }

  function showNotification(title, body){ if(window.Notification && Notification.permission === 'granted'){ try { new Notification(title, { body }); } catch(e){ alert(title+'\n'+body); } } else { alert(title+'\n'+body); } }

  function checkExpirations(manual=false){ const items = loadProducts(); const nowExpired = []; const nowSoon = [];
    items.forEach(it => {
      const days = daysUntil(it.expiry);
      if(days <= 0 && !it.notified){ nowExpired.push(it); it.notified = true; }
      else if(days <= it.reminderDays && !it.notified && it.reminderDays>0){ nowSoon.push(it); it.notified = true; }
    });
    if(nowExpired.length || nowSoon.length){ saveProducts(items); nowExpired.forEach(it => showNotification(t('expired')+': '+it.name, it.expiry)); nowSoon.forEach(it => showNotification(t('listTitle')+': '+it.name, 'Expires '+it.expiry)); }
    else if(manual){ alert('OK — '+ (items.length ? `${items.length} ${t('listTitle').toLowerCase()}` : 'немає товарів')); }
    render();
  }

  function exportJSON(){ const items = loadProducts(); const blob = new Blob([JSON.stringify(items, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'products.json'; a.click(); URL.revokeObjectURL(url); }
  function importJSON(file){ const reader = new FileReader(); reader.onload = e => { try { const parsed = JSON.parse(e.target.result); if(Array.isArray(parsed)){ saveProducts(parsed); alert(t('importSuccess')); render(); } else throw new Error('not array'); } catch(err){ alert(t('invalidJson')); } }; reader.readAsText(file); }

  function resetNotifications(){ const items = loadProducts(); items.forEach(it => it.notified = false); saveProducts(items); render(); }

  function render(){
    el.title.textContent = t('title'); el.addBtn.textContent = t('add'); el.checkBtn.textContent = t('checkNow'); el.exportBtn.textContent = t('export'); el.importBtn.textContent = t('import'); el.langLabel.textContent = t('langLabel'); el.productName.placeholder = t('namePlaceholder'); el.footerText.textContent = t('footer'); el.listTitle.textContent = t('listTitle');

    const items = loadProducts().sort((a,b)=> new Date(a.expiry) - new Date(b.expiry));
    el.productList.innerHTML = '';
    if(items.length === 0){ const li = document.createElement('li'); li.className = 'product-item'; li.textContent = '-'; el.productList.appendChild(li); return; }

    items.forEach(it => {
      const li = document.createElement('li'); li.className = 'product-item';
      const meta = document.createElement('div'); meta.className = 'meta';
      const name = document.createElement('div'); name.className = 'name'; name.textContent = it.name;
      const date = document.createElement('div'); date.className = 'date'; date.textContent = it.expiry + (it.reminderDays?` (remind ${it.reminderDays}d)`:'');
      meta.appendChild(name); meta.appendChild(date);

      const info = document.createElement('div');
      const d = daysUntil(it.expiry);
      const daysSpan = document.createElement('span'); daysSpan.className = 'days';
      if(d <= 0){ daysSpan.classList.add('expired'); daysSpan.textContent = `${t('expired')}`; }
      else if(d <= 3){ daysSpan.classList.add('warning'); daysSpan.textContent = t('daysLeft', d); }
      else { daysSpan.classList.add('ok'); daysSpan.textContent = t('daysLeft', d); }

      const actions = document.createElement('div'); actions.className = 'actions';
      const resetBtn = document.createElement('button'); resetBtn.textContent = '🔁'; resetBtn.title = 'Reset notification'; resetBtn.onclick = ()=>{ it.notified=false; saveProducts(items); render(); };
      const delBtn = document.createElement('button'); delBtn.textContent = '✖'; delBtn.title='Delete'; delBtn.onclick = ()=> deleteProduct(it.id);
      actions.appendChild(resetBtn); actions.appendChild(delBtn);

      info.appendChild(daysSpan);
      li.appendChild(meta);
      li.appendChild(info);
      li.appendChild(actions);
      el.productList.appendChild(li);
    });
  }

  // Events
  el.addBtn.addEventListener('click', ()=>{ addProduct(el.productName.value.trim(), el.expiryDate.value, el.reminderDays.value); el.productName.value=''; el.expiryDate.value=''; });
  el.checkBtn.addEventListener('click', ()=> checkExpirations(true));
  el.exportBtn.addEventListener('click', exportJSON);
  el.importBtn.addEventListener('click', ()=> el.importFile.click());
  el.importFile.addEventListener('change', (e)=>{ const f = e.target.files[0]; if(f) importJSON(f); e.target.value=''; });

  el.langSelect.addEventListener('change', (e)=>{ lang = e.target.value; localStorage.setItem(LANG_KEY, lang); render(); });

  // Request notification permission
  function requestNotificationPermission(){ if(!('Notification' in window)) return; if(Notification.permission === 'default'){ Notification.requestPermission().then(()=>{}); } }

  // initial render
  requestNotificationPermission(); render();
  // periodic check
  setInterval(()=> checkExpirations(false), 60*1000);
  checkExpirations(false);
})();
