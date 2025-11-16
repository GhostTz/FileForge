Hallo Gemini. Wir setzen die Entwicklung meines Projekts "Zrs" (ZeroRequestSystem) fort. Du agierst weiterhin als mein Projektmanager.

PROJEKTÜBERSICHT:
Wir bauen das Projekt "Zrs" von Grund auf neu auf. Das Ziel ist ein modernes, design-orientiertes Medienportal, das extrem benutzerfreundlich und auf allen Geräten (Desktop & Mobile) eine erstklassige Erfahrung bietet. Die Kernfunktionalitäten umfassen das Anfragen von Medien, das Verwalten des eigenen Accounts und innovative Entdeckungs-Features.

KERNPRINZIPIEN & DESIGN:
- Design-First: Höchste Priorität hat ein minimalistisches, elegantes "Glassmorphism"-Design mit einem lila/dunkelblauen Farbschema.
- Mobile-First: Jede Komponente muss auf Mobilgeräten perfekt aussehen und funktionieren.
- Intuitive UX: Die Bedienung soll so einfach sein, dass sie selbsterklärend ist. Fließende Animationen und eine reaktionsschnelle Oberfläche sind entscheidend.
- Sicherheit & Stabilität: Die Anwendung wird für den Live-Betrieb entwickelt. Sicherheit und Stabilität sind nicht verhandelbar.

TECHNOLOGIE-STACK:
- Frontend: Pures HTML, CSS und JavaScript (ES Modules). Kein Framework.
- Backend: Node.js mit Express.js.
- Datenbank: MySQL.

REGELN FÜR UNSERE ZUSAMMENARBEIT:
- Immer ganze Dateien: Du gibst bei jeder Änderung immer den vollständigen Code der betroffenen Datei an. Keine Auslassungen, keine Kommentare wie "// ... restlicher Code ...".
- Keine Annahmen: Wenn eine Anweisung unklar ist, fragst du nach, anstatt etwas zu erfinden.
- Strikter Tech-Stack: Wir verwenden ausschließlich die oben genannten Technologien.

AKTUELLER STAND DES PROJEKTS (ERREICHTE MEILENSTEINE):

PROJEKT-STRUKTUR:
- Eine saubere, modulare Ordnerstruktur ist etabliert (config, routes, middleware, public).
- Das Frontend ist ebenfalls modular aufgebaut:
  - `public/js/app.js`: Der Haupt-Controller, der die SPA steuert (Routing, Laden von Views).
  - `public/js/auth.js`: Kapselt die Login/Logout-Logik.
  - `public/js/utils.js`: Beinhaltet wiederverwendbare Funktionen (fetchData, postData, createMediaCard, Modal-Logik).
  - `public/js/views/`: Ein Ordner für seiten-spezifische Logik (`dashboardView.js`, `requestsView.js`, `discoverView.js`).

BACKEND-SETUP:
- Ein Express-Server ist konfiguriert und läuft.
- Die MySQL-Verbindung über einen Connection Pool ist stabil.
- API-Routen sind modular in `routes/*.js` organisiert.
- Ein `server.js` Skript fängt alle App-Pfade ab (`/dashboard.html`, `/discover.html` etc.) und leitet sie korrekt zur SPA-Hülle (`public/dashboard.html`), um Browser-Reloads zu ermöglichen.

PRE-FLIGHT CHECKS & DATENBANK-INITIALISIERUNG:
- Beim Serverstart wird ein `preflightChecks.js` Skript ausgeführt, das Node.js-Version, .env-Datei und node_modules überprüft.
- Direkt danach prüft `db_init.js` die Datenbank, erstellt Tabellen bei Bedarf und führt eine interaktive Daten-Integritätsprüfung durch.

AUTHENTIFIZIERUNG & SICHERHEIT:
- Die Benutzerauthentifizierung erfolgt ausschließlich über die Jellyfin-API. Es werden keine Passwörter in der Zrs-Datenbank gespeichert.
- Nach erfolgreichem Login wird ein sicherer JSON Web Token (JWT) erstellt und an den Client gesendet.
- Eine `protect`-Middleware (`authMiddleware.js`) sichert alle sensiblen API-Endpunkte.

FRONTEND-ARCHITEKTUR & VIEWS:
- Die App ist als Single-Page-Application (SPA) konzipiert. `index.html` ist die Login-Seite, `dashboard.html` ist die Hülle für den eingeloggten Bereich.
- Die Login-Seite (`index.html` & `login.js`) ist fertig und leitet bei Erfolg weiter.
- Das Dashboard (`dashboard-view.html` & `dashboardView.js`) zeigt personalisierte Statistiken an, die über einen geschützten API-Endpunkt (`/api/dashboard/stats`) abgerufen werden.
- Die Anfragen-Seite (`requests-view.html` & `requestsView.js`) ist implementiert. Sie verfügt über einen dynamischen Hero-Banner, eine Live-Suche und erlaubt das Senden von Anfragen.
- Ein "Slide-in"-Modal für Detailansichten ist in `utils.js` implementiert und wird von mehreren Ansichten genutzt.

ENTDECKEN-SEITE (`discover-view.html` & `discoverView.js`):
- Diese Seite ist fertiggestellt und voll funktionsfähig.
- Sie zeigt dem Benutzer verschiedene Kategorien (Trending, Neu, Action, etc.) in einer bei jedem Besuch zufällig gemischten Reihenfolge an.
- Jede Kategorie wird als horizontales Karussell dargestellt.
- Die Daten werden dynamisch über einen flexiblen Backend-Endpunkt (`/api/tmdb/discover?category=...`) geladen.
- Jedes Karussell verfügt über funktionierende, mit Glassmorphism-Effekt gestylte Pfeil-Buttons zur Navigation, die NEBEN dem Titel der Kategorie angezeigt werden.
- Die Pfeile werden auf dem Desktop nur dann angezeigt, wenn die Anzahl der Filme die sichtbare Breite des Containers übersteigt. Auf Mobilgeräten sind sie standardmäßig sichtbar, wenn gescrollt werden kann. Die Logik hierfür ist robust und funktioniert auf allen Bildschirmgrößen.

NÄCHSTER SCHRITT:
Wir haben die "Entdecken"-Seite erfolgreich fertiggestellt. Bitte schlage den nächsten logischen Schritt für das Projekt vor.