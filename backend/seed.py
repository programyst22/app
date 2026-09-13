"""Idempotent seed: accounts, CMS defaults (texts from oka-bau.eu), portfolio from real OKA Bau media, settings."""
import os
from core import db, iso, uid, hash_password, DEFAULT_STAGES, SERVICES

WORK = "https://oka-bau.eu/assets/work/"

CMS_DEFAULTS = {
    "hero": {"eyebrow": "AUGSBURG · INNENAUSBAU · OBJEKTSERVICE", "headline": ["Räume.", "Immobilien.", "Lösungen."],
             "subtitle": "Innenausbau, Renovierung und Objektservice in Augsburg – zuverlässig aus einer Hand.",
             "cta": "Projekt starten", "cta_secondary": "Leistungen ansehen"},
    "services": {"eyebrow": "Leistungen", "headline": "Was Ihr Objekt braucht. Aus einer Hand.", "items": SERVICES},
    "about": {"eyebrow": "Kompetenzen", "headline": "Sicher geplant. Sauber umgesetzt.",
              "text": "Wir kümmern uns um die Details, damit Abläufe klar bleiben und das Ergebnis überzeugt.",
              "values": [
                  {"title": "Innenausbau", "text": "Trockenbau, Verkleidungen, Decken und Innenraumlösungen mit sauberer Vorbereitung und präziser Ausführung."},
                  {"title": "Renovierung", "text": "Bestehende Räume werden strukturiert überarbeitet – vom Untergrund bis zum fertigen Finish."},
                  {"title": "Bad & Oberflächen", "text": "Koordinierte Badsanierung, Fliesen- und Oberflächenarbeiten für ein stimmiges Gesamtbild."},
                  {"title": "Montage", "text": "Türen, Fenster, Leisten, Fugen und Montagearbeiten werden sauber in den Projektablauf integriert."},
                  {"title": "Objektservice", "text": "Hausmeisterservice, Reinigung und kleine Instandhaltungen für private und gewerbliche Objekte."},
              ]},
    "katharina": {"name": "Katharina Kling", "title": "Immobilienfachwirtin · OKA Bau",
                  "quote": "„Gute Arbeit beginnt für mich mit klaren Absprachen. Was wir zusagen, setzen wir sauber und verlässlich um.“",
                  "image": "https://oka-bau.eu/assets/director.jpg"},
    "process": {"eyebrow": "Zusammenarbeit", "headline": "Von Ihrer Idee zum nächsten Schritt.", "steps": [
        {"title": "Anfrage", "text": "Sie schildern Ihr Vorhaben, den Standort und Ihren gewünschten Zeitraum – telefonisch oder per E-Mail."},
        {"title": "Bestandsaufnahme", "text": "Wir klären die Anforderungen und vereinbaren bei Bedarf einen Termin vor Ort."},
        {"title": "Angebot & Abstimmung", "text": "Leistungsumfang, Kosten und Ablauf werden besprochen, bevor Sie den Auftrag erteilen."},
        {"title": "Umsetzung", "text": "Die Arbeiten erfolgen nach Abstimmung. Rückfragen und Änderungen klären wir mit Ihnen."},
        {"title": "Abnahme", "text": "Zum Abschluss gehen wir die vereinbarten Leistungen gemeinsam durch und besprechen offene Punkte."},
    ]},
    "faq": {"eyebrow": "FAQs", "headline": "Alles, was Sie wissen möchten.", "items": [
        {"q": "Welche Leistungen bietet OKA Bau an?", "a": "Innenausbau und Trockenbau, Renovierung und Badsanierung, Boden und Leisten, Türen und Fenstermontage sowie Hausmeisterservice und Reinigung."},
        {"q": "Arbeiten Sie für Privatkunden und Unternehmen?", "a": "Ja. Wir unterstützen private Renovierungsprojekte ebenso wie gewerbliche Objekte und Hausverwaltungen."},
        {"q": "Wo ist OKA Bau tätig?", "a": "Der Schwerpunkt liegt in Augsburg und Umgebung. Den genauen Einsatzort klären wir bei Ihrer Anfrage."},
        {"q": "Wie läuft eine Anfrage ab?", "a": "Sie nennen uns Objekt, Leistung und Terminrahmen. Danach klären wir den Bestand, stimmen das Angebot ab und planen die Umsetzung bis zur gemeinsamen Abnahme."},
        {"q": "Wie erreiche ich OKA Bau am schnellsten?", "a": "Telefonisch unter +49 821 65085943 oder per E-Mail an info@okabau.de."},
    ]},
    "contact": {"eyebrow": "IHR PROJEKT", "headline": "Lassen Sie uns darüber sprechen.", "phone": "+49 821 65085943", "email": "info@okabau.de",
                "address": "Alfred-Nobel-Straße 9, 86156 Augsburg", "legal": {"impressum": "https://oka-bau.eu/impressum", "datenschutz": "https://oka-bau.eu/datenschutz"}},
    "announcements": {"items": []},
}

PORTFOLIO = [
    {"title": "Neue Fliesen fürs Bad", "category": "Renovierung & Badsanierung", "description": "Großformatige Wandfliesen und die Verkleidung der WC-Vorwand. Die Aufnahmen zeigen die Verlegung mit Nivellierhilfen während der laufenden Arbeiten.", "photos": ["bad-fliesen-wand.webp", "bad-fliesen-vorwand.webp", "bad-fliesen-detail.webp"], "featured": True},
    {"title": "Innenräume im Detail", "category": "Renovierung & Badsanierung", "description": "Ein Rundgang durch helle Räume: geflieste Badflächen, Bodenbeläge und die Übergänge zwischen den Wohnbereichen.", "photos": ["dekorwand.webp"]},
    {"title": "Ausbau im Treppenhaus", "category": "Innenausbau & Trockenbau", "description": "Beplankte Wände, ausgearbeitete Deckenanschlüsse und gespachtelte Flächen. Die Aufnahmen zeigen einzelne Arbeitsschritte im Treppenhaus.", "photos": ["treppenhaus-beplankung.webp", "treppenhaus.webp", "deckendetail.webp"], "featured": True},
    {"title": "Dämmung im Holzbau", "category": "Innenausbau & Trockenbau", "description": "Einblick in die Arbeit an einer Holzkonstruktion mit Dämmmaterial zwischen den Ständern und unter der Dachschräge.", "photos": ["daemmung.webp"]},
    {"title": "Räume im Wandel", "category": "Renovierung & Badsanierung", "description": "Ein Rundgang während der Renovierung. Vorbereitete Wandflächen und offene Arbeitsbereiche zeigen den aktuellen Ausbauzustand.", "photos": ["staenderwand.webp", "bad-vorbereitung.webp"]},
    {"title": "Rund ums Gebäude", "category": "Hausmeisterservice", "description": "Einblicke in Außenbereiche während der Arbeiten sowie unterschiedliche Belagsflächen an Wohngebäuden.", "photos": ["aussenbereich.webp", "balkon.webp", "aussen-bestand.webp"]},
]


async def seed():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    for coll in ["leads", "projects", "project_zones", "messages", "files", "offers", "invoices", "appointments", "tasks", "notifications", "activity_logs"]:
        await db[coll].create_index("id", unique=True)
    await db.messages.create_index([("project_id", 1), ("created_at", 1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])

    admin_email = os.environ["ADMIN_EMAIL"].lower()
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({"id": uid(), "email": admin_email, "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]), "first_name": "Katharina", "last_name": "Kling",
                                   "role": "SUPER_ADMIN", "disabled": False, "email_verified": True, "created_at": iso()})
    for email, pw, fn, ln, role in [("mitarbeiter@okabau.de", "OkaBau!Team2026", "Max", "Mustermann", "EMPLOYEE"), ("kunde@example.com", "OkaBau!Kunde2026", "Test", "Kunde", "CLIENT")]:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one({"id": uid(), "email": email, "password_hash": hash_password(pw), "first_name": fn, "last_name": ln, "role": role, "disabled": False,
                                       "email_verified": True, "can_publish_client_updates": True, "created_at": iso()})
    for key, content in CMS_DEFAULTS.items():
        if not await db.cms.find_one({"key": key}):
            await db.cms.insert_one({"key": key, "content": content, "updated_at": iso()})
    if not await db.settings.find_one({"id": "global"}):
        await db.settings.insert_one({"id": "global", "workflow_stages": DEFAULT_STAGES, "project_number_format": "OKA-{year}-{seq:04d}",
                                      "offer_number_format": "AN-{year}-{seq:04d}", "invoice_number_format": "RE-{year}-{seq:04d}"})
    if await db.portfolio.count_documents({}) == 0:
        for p in PORTFOLIO:
            urls = [WORK + f for f in p["photos"]]
            await db.portfolio.insert_one({"id": uid(), "title": p["title"], "category": p["category"], "description": p["description"], "location": "Augsburg",
                                           "cover_id": None, "cover_url": urls[0], "photo_ids": [], "photo_urls": urls, "video_ids": [], "before_after": [],
                                           "featured": p.get("featured", False), "published": True, "project_id": None, "source": "oka-bau.eu",
                                           "created_at": iso(), "updated_at": iso(), "deleted_at": None})
