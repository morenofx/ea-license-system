# 🔑 LICENSE SYSTEM - Setup Guide

Sistema di licenze per i tuoi Expert Advisors MT4.

---

## STEP 1: Crea Database su Supabase (5 minuti)

### 1.1 Registrazione
1. Vai su **https://supabase.com**
2. Clicca **"Start your project"**
3. Registrati con GitHub (consigliato) o email

### 1.2 Crea Progetto
1. Clicca **"New Project"**
2. Nome: `ea-licenses` (o quello che vuoi)
3. Password database: **salvala!** (non serve per le API)
4. Region: scegli Europa
5. Clicca **"Create new project"**
6. Aspetta 2 minuti...

### 1.3 Crea Tabella
1. Nel menu a sinistra clicca **"SQL Editor"**
2. Clicca **"New Query"**
3. Incolla questo codice:

```sql
CREATE TABLE licenses (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(50) NOT NULL,
  client_name VARCHAR(100) NOT NULL,
  ea_product VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_account_product ON licenses(account_number, ea_product);
```

4. Clicca **"Run"** (pulsante verde)
5. Deve apparire "Success"

### 1.4 Ottieni Credenziali API
1. Clicca **"Project Settings"** (icona ingranaggio in basso a sinistra)
2. Clicca **"API"** nel menu
3. Copia questi valori:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`

**SALVALI! Ti serviranno nel prossimo step.**

---

## STEP 2: Deploy su Vercel

### 2.1 Carica su GitHub
1. Crea nuovo repository: `ea-license-system`
2. Carica tutti i file:
   ```
   api/
     admin.js
     license.js
   admin.html
   package.json
   vercel.json
   ```

### 2.2 Deploy su Vercel
1. Vai su **vercel.com**
2. **"Add New Project"**
3. Importa `ea-license-system`
4. **PRIMA di cliccare Deploy**, aggiungi Environment Variables:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` (dal step 1.4) |
| `SUPABASE_KEY` | `eyJhbGciOiJIUzI1...` (dal step 1.4) |
| `ADMIN_PASSWORD` | `TuaPasswordSegreta123` (scegli tu!) |

5. Clicca **"Deploy"**

---

## STEP 3: Configura il tuo EA MT4

### 3.1 Aggiungi il codice al tuo EA
1. Apri il file `LICENSE_CODE_MT4.mq4`
2. Copia le variabili e la funzione `CheckLicense()`
3. Incollale nel tuo EA
4. Modifica `LICENSE_SERVER` con il tuo URL Vercel:
   ```
   string LICENSE_SERVER = "https://ea-license-system.vercel.app/api/license";
   ```

### 3.2 Modifica OnInit()
Aggiungi all'inizio del tuo OnInit():
```mql4
int OnInit()
{
   // Check license first
   if(!CheckLicense())
   {
      return INIT_FAILED;
   }
   
   // ... resto del tuo codice ...
}
```

### 3.3 Abilita WebRequest in MT4
1. In MetaTrader: **Tools → Options → Expert Advisors**
2. Spunta ✓ **"Allow WebRequest for listed URL"**
3. Aggiungi: `https://ea-license-system.vercel.app`
4. OK

---

## STEP 4: Usa l'Admin Panel

1. Vai su: `https://ea-license-system.vercel.app/admin.html`
2. Login con la password che hai scelto (ADMIN_PASSWORD)
3. Aggiungi licenze:
   - Account: `123456789`
   - Nome: `Mario Rossi`
   - Prodotto: `XAU_AutoTrader`
4. Per cambiare conto: rimuovi il vecchio, aggiungi il nuovo

---

## Come Funziona

```
Cliente avvia EA
       ↓
EA chiama: /api/license?account=123456&product=XAU_AutoTrader
       ↓
Server controlla database
       ↓
  ┌────┴────┐
  ↓         ↓
TROVATO   NON TROVATO
  ↓         ↓
EA parte  EA bloccato
```

---

## Links dopo il Deploy

- **Admin Panel**: `https://TUO-PROGETTO.vercel.app/admin.html`
- **API Verifica**: `https://TUO-PROGETTO.vercel.app/api/license`

---

## Troubleshooting

**EA dice "Add URL to WebRequest":**
→ Tools → Options → Expert Advisors → Aggiungi URL

**Admin panel non carica:**
→ Controlla SUPABASE_URL e SUPABASE_KEY in Vercel

**"Unauthorized" nell'admin:**
→ Password sbagliata, controlla ADMIN_PASSWORD

---

© 2025 Moreno Dainese
