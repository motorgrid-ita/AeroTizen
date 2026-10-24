# Ambito e validazione

La V992.56 è un insieme di funzionalità orientate al progetto AeroTizen: sono applicabili in linea di principio a TV Samsung Tizen compatibili, non richiedono il modello S90C come condizione d'uso. L'hardware con cui sono state provate le versioni recenti è la Samsung S90C (Tizen 7).

**Questo non dimostra compatibilità universale.** Alcune API e le prestazioni di CSS/JS dipendono dalla versione di Tizen, dalle app installate e dalle caratteristiche di ogni TV. Prima delle PR upstream vanno aggiunti test automatici del progetto e, quando possibile, prove su Tizen meno recente (2020+).

La V992.56 contiene 30 file JavaScript ed è stata controllata tramite `node --check`. Non vengono riportati benchmark S90C o test hardware eseguiti in questa fase di consolidamento; i riscontri precedenti sono conversazionali e non costituiscono un test CI riproducibile.

La V992.56 NON contiene le modifiche sperimentali delle V992.48/49/50 a HomeWatcher. Il sistema ufficiale ha introdotto da allora altre correzioni e un diverso sistema di release: non importare indiscriminatamente `launcher/service/index.js` dalla nostra versione.

Preservare: ID applicazione `DclHome001.Home`, ID package `DclHome001`, persistenza delle preferenze, formati ora/data Samsung, artwork, input, focus remote e servizio Frame Art Mode upstream.
