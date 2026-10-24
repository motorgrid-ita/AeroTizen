# Procedura GitHub — fork, rami, PR

## Prerequisito verificato il 2026-10-24

L'account collegato è `motorgrid-ita`. Il repository ufficiale `helalaou/AeroTizen` è leggibile ma non scrivibile da questo account. Il fork `motorgrid-ita/AeroTizen` non risulta creato. La connessione GitHub attuale non espone un'azione `fork repository`, quindi serve **creare il fork una volta nell'interfaccia GitHub**:

1. Aprire https://github.com/helalaou/AeroTizen/fork
2. Come proprietario scegliere `motorgrid-ita`; nome `AeroTizen`.
3. Fare clic su `Create fork`.
4. Al termine il repository deve apparire come https://github.com/motorgrid-ita/AeroTizen

## Poi: PR separate

Usare preferibilmente un git locale o la connessione GitHub. Da terminale:

```bash
git clone https://github.com/motorgrid-ita/AeroTizen.git
cd AeroTizen
git remote add upstream https://github.com/helalaou/AeroTizen.git
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
```

Per la PR #22, ad esempio:

```bash
git switch -c feat/home-favourites-context-menu
# Adattare i soli file pertinenti dall'archivio di riferimento V992.56.
# Aggiungere test e seguire CONTRIBUTING.md.
ruff check . && ruff format --check . && pytest
npm run lint && npm test
git add launcher tests
git commit -m "feat(launcher): manage Home favourites from app tiles"
git push -u origin feat/home-favourites-context-menu
```

Poi aprire https://github.com/helalaou/AeroTizen/compare/main...motorgrid-ita:feat/home-favourites-context-menu (link indicativo, richiede branch realmente pubblicato) e selezionare **Create pull request**. Ripetere con un ramo nato da `upstream/main` per ogni PR.

**NON eseguire `git push` dalla cartella `AeroTizen_V99256_GitHub_Consolidation` verso il fork `main`: è uno snapshot di riferimento, non un fork aggiornato dell'upstream.**
