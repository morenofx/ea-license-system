# 🤖 EA Business Dashboard

Dashboard unificata per gestire il business degli Expert Advisor:
- **📊 Vendite** - Traccia vendite MQL5 Market + Private
- **🔑 Licenze** - Gestione licenze per EA (verifica online)
- **💰 Tasse** - Calcolo automatico IRPEF, INPS, addizionali
- **📥 Export** - Backup JSON + Report fiscale PDF

---

## 🚀 Setup

### 1. Database Supabase

Hai già il database `licenses`. Ora aggiungi la tabella `sales`:

1. Vai su **Supabase** → SQL Editor
2. Esegui il contenuto di `DATABASE_SETUP.sql`
3. Verifica che la tabella `sales` sia stata creata

### 2. Deploy su Vercel

**Opzione A: Aggiorna il repo esistente**

1. Su GitHub, vai al repo `ea-license-system`
2. Sostituisci/aggiungi questi file:
   - `api/admin.js` (aggiornato)
   - `api/license.js` (invariato)
   - `dashboard.html` (nuovo)
   - `admin.html` (redirect)
   - `index.html` (redirect)
3. Vercel fa auto-deploy

**Opzione B: Nuovo repo**

1. Crea nuovo repo `ea-dashboard`
2. Carica tutti i file
3. Deploy su Vercel
4. Configura Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `ADMIN_PASSWORD`

---

## 📁 Struttura File

```
ea-dashboard/
├── api/
│   ├── admin.js      ← API gestione (licenses + sales + export)
│   └── license.js    ← API verifica EA (invariata)
├── dashboard.html    ← Dashboard unificata
├── admin.html        ← Redirect (retrocompatibilità)
├── index.html        ← Redirect
├── package.json
├── vercel.json
├── DATABASE_SETUP.sql
└── README.md
```

---

## 🔗 URL dopo deploy

- **Dashboard**: `https://ea-license-system-three.vercel.app/dashboard.html`
- **API Licenze**: `https://ea-license-system-three.vercel.app/api/license` (per EA)

---

## ✨ Funzionalità

### Vendite
- Aggiungi vendite **MQL5 Market**, **Private** o **🎁 Free**
- Conversione automatica USD → EUR (API Frankfurter)
- Per vendite **Private**: opzione per creare licenza automaticamente
- Per **Free/Regalo**: crea licenza SEMPRE, importo €0, non conta nelle tasse!

### Licenze
- Gestione identica al vecchio admin panel
- API `/api/license` invariata (EA funzionano come prima)

### Tasse
- Calcolo IRPEF progressiva italiana
- INPS Gestione Separata (solo se > €5.000)
- Addizionali stimate
- Considera altri redditi per aliquota marginale
- **Esclude automaticamente i Free dal calcolo!**

### Export
- JSON completo (vendite + licenze)
- Filtra per anno
- Report fiscale stampabile/PDF (esclude Free)

---

## 🔄 Retrocompatibilità

- L'URL `/admin.html` funziona ancora (redirect)
- L'API `/api/license` è invariata
- Gli EA NON richiedono modifiche

---

© 2025-2026 Moreno Dainese
