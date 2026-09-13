# OKA Bau – Digitales Ökosystem (PRD)

## Original Problem Statement (Kurzfassung)
Komplettes, produktionsreifes System für OKA Bau GmbH & Co. KG (Augsburg): native iOS/Android-App + Web (Expo), Kundenportal, Mitarbeiterportal, Admin/CRM, Backend, Auth, Dateispeicher, Realtime-Chat, Push, Projektmanagement, Angebote/Rechnungen, Termine, CMS, Medienbibliothek, 3D-Visualisierung ("PROJEKT 3D" digitaler Zwilling mit Zonen, Status-Farben, Zeitleiste), Analytics, Audit-Log, DSGVO. Design: Swiss/German minimalism, editorial, premium, Farben schwarz/warmweiß/sand/orange-Akzent. Keine erfundenen Zahlen/Referenzen.

## Nutzerentscheidungen
- Stack: Expo + FastAPI + MongoDB (statt Supabase/Next.js – nicht verfügbar in Umgebung)
- Auth: JWT E-Mail/Passwort + Emergent Google Login
- Phase 1: Öffentliche App + Kundenportal + Admin/CRM zusammen
- Push: Emergent-managed Push (Expo) – benötigt `google-services.json` + nativen Build
- Assets: Nutzer lädt eigene Assets hoch; bis dahin echte Fotos/Texte von oka-bau.eu

## Architektur
- `backend/core.py` – DB, JWT/bcrypt-Auth, Rollen (CLIENT, EMPLOYEE, PROJECT_MANAGER, MANAGER, ADMIN, SUPER_ADMIN), Aktivitätslog, Benachrichtigungen (In-App + Push-Relay + E-Mail-Outbox-Abstraktion), Emergent Object Storage, signierte Datei-URLs, Nummernkreise (konfigurierbar `OKA-{year}-{seq:04d}`)
- `backend/routers/` – auth, crm (öffentliche Anfrage, Leads, Kunden, Lead→Projekt), projects (Projekte, Zonen, 3D-Modelle, Updates, Timeline, Aufgaben, Bautagebuch, Medien, Vorher/Nachher, Team), commerce (Angebote inkl. digitale Annahme + PDF, Rechnungen + PDF), comms (Chat mit Polling/Typing/Lesestatus, Termine, Benachrichtigungen), files (Dokumente, Medienbibliothek, Download), admin (Dashboards, Analytics, Aktivität, Suche, CMS, Portfolio, Mitarbeiter, Einstellungen)
- `backend/seed.py` – Accounts, CMS-Texte (oka-bau.eu), Portfolio aus echten OKA-Bau-Fotos, Workflow-Phasen
- Frontend Expo Router: `(tabs)` Home/Leistungen/Projekte/Mein Projekt/Kontakt; `anfrage`; `auth/reset`; `client/project/[id]`, `client/chat/[id]`, `client/offer/[id]`; `employee/*`; `admin/*` (Tabs Dashboard/CRM/Projekte/Mehr + `project/[id]`, `lead/[id]`, `list/[entity]`)
- 3D: `src/three/` – R3F (web) / R3F native (expo-gl), Qualitätsstufen HIGH/MEDIUM/LOW/FALLBACK, reduced-motion, Hero-Szene, interaktives Service-Haus, ProjectTwin (Zonen-Farben, Zeitleisten-Slider, GLB-Laden im Web), 2D-Fallback ZoneGrid

## Umgesetzt (13.06.2026)
- Öffentliche App komplett (3D-Hero, Leistungen, Service-Haus, Portfolio, Über/Werte, Katharina Kling, Ablauf, FAQ, Kontakt, Anfrageformular mit Foto-Upload + Einwilligung)
- Auth: Registrierung, Login, Reset, Magic-Link-Endpunkte, E-Mail-Verifizierung, Emergent Google-Login (Web: Redirect → /mein-projekt, Native: openAuthSessionAsync, session_id-Austausch über POST /api/auth/session, 7-Tage-Session), Rollen/Permissions
- Kundenportal: Dashboard, Mein Projekt (12 Sektionen), 3D-Zwilling + Fallback, Chat, Dokumente, Angebot annehmen/ablehnen (User/Zeit/IP/Version), Rechnungen, Termine bestätigen
- Mitarbeiterportal: Dashboard, Projektscreen (Update, Fotos, Fortschritt, Aufgaben, Bautagebuch)
- Admin: Dashboard, Kanban (Long-Press-Drag + Verschieben), Lead-Detail + Umwandlung, Projekte, Projektseite mit 14 Tabs inkl. 3D-Editor (GLB-Upload, Zonen, Kamera/Licht), Angebote/Rechnungen/PDF, Termine, Team, Einstellungen; Mehr: Kunden, Mitarbeiter, Aufgaben, Kalender, Nachrichten, Angebote, Rechnungen, Portfolio, CMS, Medien, Benachrichtigungen, Analytics, Aktivitätsprotokoll, Einstellungen
- Tests: 45 Backend-Tests (pytest, `/app/backend/tests`) + Frontend-Smoke bestanden

## Backlog (priorisiert)
- P0: `google-services.json` vom Nutzer → Push aktivieren (Build nötig); echte OKA-Bau-Assets/Logo einbinden
- P1: GLB-Laden auf nativen Geräten (Dev-Build + Loader-Polyfills); WebSocket statt Polling im Chat; E-Mail-Provider (Resend) an Outbox anschließen; Kalender-Monatsraster; Datepicker statt Textfelder
- P1: Vorher/Nachher-Erstellung im Admin-UI (API vorhanden), 360°-Bilder-Viewer, Video-Player
- P2: Sign in with Apple, DSGVO-Export/Löschung per Self-Service, Rechnungs-Mahnwesen, Mehrsprachigkeit
