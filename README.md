# Here are your Instructions

## Sicherheit & Ersteinrichtung (OKA Bau OS)
- **Keine Standardpasswörter.** Der Server liefert keinen Default-Admin aus. Der erste `SUPER_ADMIN` wird einmalig über `POST /api/auth/setup` (App-Route `/setup`) angelegt; danach ist der Endpunkt deaktiviert. Optional mit `SETUP_TOKEN` (Env) absichern.
- **Demo-Daten nur lokal.** Demo-Konten entstehen ausschließlich bei `SEED_DEMO_DATA=true` (Passwort aus `DEMO_PASSWORD`). In Produktion `SEED_DEMO_DATA=false` setzen.
- Passwörter: bcrypt. Sessions: JWT (`JWT_SECRET` in Produktion neu setzen). Dateien: privat, Zugriff nur über kurzlebige signierte URLs.
- Historische Commits der Vorschau-Umgebung enthielten Dev-Passwörter; diese wurden rotiert und sind ungültig. Für Produktion `JWT_SECRET`, `DEMO_PASSWORD` und `SETUP_TOKEN` neu vergeben.

## ACTION REQUIRED: Push-Benachrichtigungen
Die Expo-Push-Infrastruktur (Emergent Push Relay) ist vollständig implementiert. Damit Pushs auf Geräten ankommen:
1. `google-services.json` aus der Firebase-Konsole (Android-Paket `com.emergent.okabuildplatform.hpgnts`) nach `/app/frontend/google-services.json` legen.
2. Über **Publish** deployen und iOS/Android-Build erzeugen (Expo Go unterstützt keine Remote-Pushs).
Ereignisse: Neue Nachricht, Neuer Termin, Termin morgen, Projektfortschritt, Neue Fotos, Neues Dokument, Angebot verfügbar, Angebotsstatus, Rechnung verfügbar, Projekt abgeschlossen.
