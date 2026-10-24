# AeroTizen — contributi upstream (riferimento V992.56)

**Target:** `helalaou/AeroTizen`, ramo `main`, a partire dal commit `69aecf8e4e20497a68116af3d5cefafe08a7d80d` (2026-10-23, launcher e CLI 2.2.0). Ricontrollare il ramo `main` prima di ogni PR.

**Importante:** questo codice rappresenta la versione di riferimento V992.56. Non è un branch derivato dall'upstream 2.2.0: `launcher/config.xml` ha versione `2.0.42`, la struttura è diversa, ed è intenzionale. Non sostituire l'intera cartella `launcher/` nel fork per aprire una PR: reimplementare/adattare ogni funzionalità al codice upstream, conservando tutte le correzioni già presenti in upstream. Il tag V992.56 è il riferimento da cui portare le funzioni.

**Compatibilità:** le funzionalità sono progettate per Samsung Tizen supportato da AeroTizen, non sono limitate alla S90C. La S90C/Tizen 7 è un dispositivo di prova; compatibilità retroattiva (Tizen 2020+) e nuovi modelli devono essere verificati secondo CONTRIBUTING.md ufficiale.

## Sequenza proposta delle PR

| Ordine | Titolo PR Conventional Commit | Area | Ambito e integrazione | Stato |
|---|---|---|---|---|
| 1 | `feat(launcher): manage Home favourites from app tiles` | `home-screen.js`, CSS, test | Issue #22: OK breve avvia, OK lungo menu Move/Remove in Home, Add/Remove in All Apps; ordine e persistenza; non lancia al rilascio di OK | Da adattare/testare sull'upstream |
| 2 | `feat(launcher): support automatic UI localization` | nuovi file i18n, markup, test | Lingua del TV (IT/EN; fallback EN); niente preferenza manuale; separare testo da nomi app e sorgenti; considerare stringhe upstream originariamente inglesi | Da adattare, non copiare il traduttore basato su stringhe alla cieca |
| 3 | `feat(launcher): offer classic and custom clock layouts` | clock, impostazioni e CSS | Layout header classico originale e layout alternativo; salvataggio; nessun cambiamento alle sorgenti con layout personalizzato | Da adattare/testare |
| 4 | `feat(launcher): add consistent Glass settings navigation` | impostazioni, CSS e navigazione | Sezioni coerenti, focus mobile con geometria uguale al controllo, nessun doppio bordo; tutte le frecce; evitare reflow Home | Richiede adattamento alla UI upstream |
| 5 | `perf(launcher): reduce square app artwork reloads` | artwork, Home, test | Riutilizzo risultati immagini Samsung, meno ricostruzioni DOM, fallback corretto; nessuna differenza visiva tra Home/All Apps | Misurare Tizen 2020+ e S90C |
| 6 | `feat(launcher): refine Home input and app layouts` | Home, inputs, CSS | Layout centrato in modalità clock classico, input in basso senza sovrapposizioni; modalità custom invariata; Live TV tradotta | Separare dai miglioramenti artwork già upstream |
| 7 | `feat(launcher): recognise named HDMI inputs in standby` | inputs, test | Sorgenti riconosciute anche se il TV indica disconnected ma ha nome utile; override per HDMI; le porte vuote si possono nascondere | Verificare comportamento multi-modello |
| 8 | `feat(launcher): offer expanded wallpapers and header appearance` | backgrounds, settings, CSS | Sfondi/meteo, opzioni, indicatore Wi-Fi, stile; solo le funzionalità non già in upstream | Deduplicare i feature già presenti nella 2.1/2.2 |

## Elementi da NON proporre in questa fase

- Modifiche sperimentali del servizio HomeWatcher delle versioni V992.48, V992.49 e V992.50: non risolte sulla TV, dunque escluse.
- Tentare di sostituire il servizio ufficiale: upstream include le correzioni Art Mode/Frame e monitoraggio delle app che non devono andare perse.
- Automatismi di release o CLI 2.2.0: già introdotti a monte (#23); non è una PR nuova.
- Copiare le tessere artwork originali di Samsung come feature ex novo: già presenti a monte; proporre soltanto differenze utili e testate.
- Archivi di installazione, certificati o package `.wgt` in Git: vietato dal progetto ufficiale.

## Checklist per ogni PR

1. Partire da `main` fresco del fork aggiornato all'upstream, non dal tag locale V992.56.
2. `git switch -c feat/<nome-funzionalità>` (branch indipendente per PR).
3. Portare solo il minimo codice richiesto, salvaguardando servizi e navigazione non coinvolti.
4. Eseguire `ruff check .`, `pytest`, `npm run lint`, `npm test` seguendo CONTRIBUTING (Node 20+).
5. Verificare navigazione D-pad e visualizzazione sulle TV disponibili; distinguere test simulati e prove hardware.
6. Pubblicare PR verso `helalaou/AeroTizen:main`, collegare issue se applicabile, documentare impatto/rollback.
7. Lasciare agli sviluppatori la revisione e il merge. L'accettazione non è garantita.
