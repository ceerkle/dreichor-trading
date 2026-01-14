# Decision Memory & Feedback Manifest (DE)

## Zweck
Dieses Dokument ergänzt das *Attention & Worthiness Manifest*.
Es beschreibt, wie das System aus vergangenen Entscheidungen lernt,
ohne seine Entscheidungslogik zu verändern.

Es geht nicht um Optimierung.
Es geht um Verhaltenskalibrierung.

---

## Grundsatz

> Das System darf sich erinnern,
> aber es darf sich nicht selbst neu erfinden.

Lernen bedeutet hier:
- besser einzuschätzen, wann Zurückhaltung angebracht ist
- nicht, neue Regeln oder Strategien zu erzeugen

---

## Keine klassische Lernlogik

Explizit ausgeschlossen sind:
- Reinforcement Learning
- automatische Parameteroptimierung
- selbstverändernde Strategieregeln
- implizite Gewichtsanpassungen

Diese Mechanismen widersprechen:
- Erklärbarkeit
- Stabilität
- Governance-Fähigkeit

---

## Decision Memory

Decision Memory ist eine strukturierte Historie von:
- Entscheidungsklassen
- Begründungstypen (Reason Codes)
- Kontextzuständen (Marktphase, Aufmerksamkeit, Stabilität)
- beobachteten Ergebnissen

Es ist kein Log.
Es ist ein Gedächtnis auf Klassenebene.

---

## Entscheidungsklassen

Jede Entscheidung gehört zu einer expliziten Klasse, z.B.:

- Aufmerksamkeitsrotation unter hoher Marktspannung
- Halten trotz besserem Alternativmarkt
- Safety Sell bei Panik
- Verzicht auf Einstieg trotz Kandidat

Die Klassen sind:
- endlich
- benannt
- versioniert

---

## Outcome-Beobachtung

Outcomes werden beobachtet, nicht bewertet im Sinne von Gewinn.

Beispiele:
- bestätigte Aufmerksamkeit
- unnötige Rotation
- zu frühes Handeln
- gerechtfertigte Vorsicht

Outcomes sind:
- zeitverzögert
- unsicher
- kontextabhängig

---

## Verhaltenskalibrierung

Decision Memory beeinflusst ausschließlich:

- benötigte Stabilität vor Entscheidungen
- notwendige Klarheit für Marktwechsel
- Zurückhaltung vs. Entschlossenheit
- Eskalationsschwellen für Sicherheit

Decision Memory beeinflusst niemals:

- Strategie-Logik
- Marktmodelle
- Parameter-Pools
- Sicherheitsregeln

---

## Rolle des Nutzers

Der Nutzer bewertet Entscheidungen:
- aggregiert
- rückblickend
- qualitativ

Beispiele:
- „würde ich wieder zulassen“
- „war unnötig nervös“
- „war riskant, aber richtig“

Der Nutzer trainiert kein Modell.
Er kalibriert Verhalten.

---

## Schutz vor Fehlanpassung

Das System muss:
- Feedback zeitlich verzögert anwenden
- einzelne Ausreißer ignorieren
- widersprüchliches Feedback neutralisieren

Kein einzelnes Ereignis darf das Verhalten dominieren.

---

## Verhältnis zu Governance (dreichor)

Decision Memory existiert unabhängig.
Governance kann später:

- Lernwirkungen begrenzen
- Verhalten einfrieren
- Vertrauen explizit entziehen

Decision Memory liefert Kontext,
Governance liefert Erlaubnis.

---

## Schluss

Dieses System wird nicht schlauer.
Es wird vorsichtiger oder entschlossener – begründet.

Es lernt nicht, recht zu haben.
Es lernt, wann es sich selbst trauen darf.

