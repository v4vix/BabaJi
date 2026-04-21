"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Surface } from "@cortex/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type Festival = {
  name: string;
  date: string; // YYYY-MM-DD
  month: string;
  type: string;
  significance: string;
  activities: string[];
  deity?: string;
};

// ── Festival Data ─────────────────────────────────────────────────────────────

const FESTIVALS: Festival[] = [
  {
    name: "Makar Sankranti",
    date: "2026-01-14",
    month: "January",
    type: "Solar Festival",
    significance: "The Sun's transition into Capricorn (Makar). Marks the end of the winter solstice period and the beginning of longer days. One of the most auspicious solar events in the Hindu calendar.",
    activities: ["Take a holy dip in rivers, especially Prayagraj", "Donate sesame seeds, jaggery, and blankets", "Fly kites (Gujarat, Rajasthan)", "Prepare til-gul laddoos", "Light sacred fires"],
    deity: "Surya (Sun God)",
  },
  {
    name: "Vasant Panchami",
    date: "2026-01-24",
    month: "January",
    type: "Seasonal Festival",
    significance: "The fifth day of the bright half of Magha — the official arrival of spring. Sacred to Saraswati, the goddess of knowledge, music, and arts. Students, scholars, and artists seek her blessings.",
    activities: ["Wear yellow clothes", "Worship Goddess Saraswati", "Begin new studies or musical training", "Prepare saffron rice and yellow sweets", "Fly yellow kites"],
    deity: "Saraswati",
  },
  {
    name: "Mahashivratri",
    date: "2026-02-26",
    month: "February",
    type: "Major Festival",
    significance: "The great night of Shiva — the 14th night of the dark fortnight in Phalguna. Celebrates the cosmic dance of Shiva (Tandava) and his union with Parvati. One of the most significant nights for Shiva devotees.",
    activities: ["Fast all day and night", "Perform Rudrabhishek (ritual bathing of Shivalinga)", "Stay awake all night in worship", "Offer bael leaves, milk, and flowers", "Chant Om Namah Shivaya"],
    deity: "Shiva",
  },
  {
    name: "Holi",
    date: "2026-03-03",
    month: "March",
    type: "Major Festival",
    significance: "The festival of colors marking the arrival of spring and the victory of good over evil. Holika Dahan the night before commemorates the burning of the demoness Holika and the protection of devotee Prahlad.",
    activities: ["Holika Dahan (bonfire) the night before", "Play with natural colors and water", "Eat gujiya, thandai, and mathri", "Sing and dance in the streets", "Visit temples and seek blessings"],
    deity: "Krishna / Vishnu",
  },
  {
    name: "Ugadi / Gudi Padwa",
    date: "2026-03-19",
    month: "March",
    type: "New Year Festival",
    significance: "The Hindu New Year for many South Indian and Maharashtrian communities. Marks the beginning of a new Samvatsara (year). A time for new beginnings, resolve, and seeking blessings for the year ahead.",
    activities: ["Raise the Gudi (auspicious flag) at home", "Read Panchanga Sravanam (year forecast)", "Eat neem and jaggery mixture (bittersweet of life)", "Wear new clothes", "Prepare Ugadi pachadi with six tastes"],
    deity: "Brahma",
  },
  {
    name: "Ram Navami",
    date: "2026-03-26",
    month: "March",
    type: "Major Festival",
    significance: "The birth anniversary of Lord Rama, the seventh avatar of Vishnu. Falls on the ninth day (Navami) of the bright half of Chaitra. Especially significant in temples housing Rama, Sita, Lakshmana, and Hanuman.",
    activities: ["Visit Rama temples", "Read or listen to Ramayana", "Fast during the day", "Perform abhishek of Rama's idol at noon", "Sing Ram bhajans"],
    deity: "Rama",
  },
  {
    name: "Hanuman Jayanti",
    date: "2026-04-08",
    month: "April",
    type: "Birth Festival",
    significance: "The birth anniversary of Lord Hanuman, the devoted servant of Rama and symbol of strength, courage, and devotion. Celebrated with great enthusiasm, especially in North and Central India.",
    activities: ["Visit Hanuman temples", "Recite Hanuman Chalisa 11 times", "Offer sindoor and garlands of flowers", "Read Sundarkanda", "Fast and donate to the needy"],
    deity: "Hanuman",
  },
  {
    name: "Akshaya Tritiya",
    date: "2026-04-22",
    month: "April",
    type: "Auspicious Day",
    significance: "One of the three self-auspicious (swayamsiddha) muhurtas in the Hindu calendar. The third day of Vaishakha's bright half. No need for muhurta calculation — any auspicious beginning on this day is blessed.",
    activities: ["Start new business ventures", "Purchase gold or property", "Begin new studies", "Perform charity and feed the poor", "Worship Vishnu and Lakshmi"],
    deity: "Vishnu / Lakshmi",
  },
  {
    name: "Buddha Purnima",
    date: "2026-05-01",
    month: "May",
    type: "Sacred Full Moon",
    significance: "The full moon of Vaishakha — marks the birth, enlightenment, and passing of Gautama Buddha. Also considered sacred in the Hindu tradition as Vaishakha Purnima, associated with Vishnu's footstep.",
    activities: ["Meditate and seek inner peace", "Light lamps near Bodhi trees", "Practice compassion and non-violence", "Study Buddhist or Vedic texts", "Feed the poor"],
    deity: "Vishnu / Buddha",
  },
  {
    name: "Rath Yatra",
    date: "2026-06-25",
    month: "June",
    type: "Major Festival",
    significance: "Lord Jagannath (a form of Vishnu) is brought out from the temple on a massive chariot and taken through the streets of Puri, Odisha. One of the largest religious processions in the world.",
    activities: ["Pull the sacred chariot", "Attend procession or watch via darshan", "Receive prasad (Mahaprasad)", "Sing and chant devotional songs", "Visit ISKCON centers worldwide"],
    deity: "Jagannath (Vishnu)",
  },
  {
    name: "Guru Purnima",
    date: "2026-07-04",
    month: "July",
    type: "Sacred Full Moon",
    significance: "The full moon of Ashadha — dedicated to honoring the Guru (spiritual teacher). Associated with Veda Vyasa, the compiler of the Vedas and Puranas. A day to express gratitude to all teachers and spiritual guides.",
    activities: ["Honor your Guru or spiritual teacher", "Study sacred texts", "Meditate on the guru-disciple lineage", "Donate books and knowledge resources", "Fast or eat satvik food"],
    deity: "Veda Vyasa / All Gurus",
  },
  {
    name: "Nag Panchami",
    date: "2026-07-26",
    month: "July",
    type: "Nature Festival",
    significance: "The fifth day of Shravana's bright half — a day to honor and worship snakes (Nagas), the guardians of the underworld and symbols of Kundalini energy and Shiva's adornment.",
    activities: ["Offer milk and flowers to snake idols or images", "Visit Nag temples", "Fast and pray for protection of family", "Do not till the ground on this day", "Release caught snakes into the wild"],
    deity: "Naga Devatas (Snake gods)",
  },
  {
    name: "Raksha Bandhan",
    date: "2026-08-12",
    month: "August",
    type: "Family Festival",
    significance: "The full moon of Shravana. Sisters tie a sacred thread (rakhi) on their brothers' wrists, symbolizing love and protection. Brothers pledge to protect and care for their sisters.",
    activities: ["Sisters tie rakhi on brothers' wrists", "Brothers give gifts and pledges of protection", "Family gatherings and feasts", "Pray for the well-being of siblings", "Prepare sweets like ladoo and barfi"],
    deity: "Family bonds",
  },
  {
    name: "Janmashtami",
    date: "2026-08-20",
    month: "August",
    type: "Major Festival",
    significance: "The birth anniversary of Lord Krishna, the eighth avatar of Vishnu. Krishna was born at midnight, so celebrations peak at midnight with the rocking of Krishna's cradle (jhula). A joyful, devotion-filled night.",
    activities: ["Fast until midnight", "Decorate Krishna's cradle (jhula)", "Sing Krishna bhajans all night", "Perform Dahi Handi (breaking the pot of yogurt)", "Visit Mathura and Vrindavan if possible"],
    deity: "Krishna",
  },
  {
    name: "Ganesh Chaturthi",
    date: "2026-08-27",
    month: "August",
    type: "Major Festival",
    significance: "The birth festival of Lord Ganesha, the elephant-headed remover of obstacles and god of new beginnings. Celebrated with great pomp in Maharashtra, Andhra Pradesh, and across India over 10 days.",
    activities: ["Install Ganesha idol at home or in community pandal", "Offer modak (his favourite sweet)", "Perform Ganesha puja twice daily", "Immerse Ganesha in water on the 10th day", "Chant Ganesh Atharvashirsha"],
    deity: "Ganesha",
  },
  {
    name: "Navratri (Sharada)",
    date: "2026-10-09",
    month: "October",
    type: "Major Festival",
    significance: "Nine nights dedicated to the nine forms of Goddess Durga (Navadurga). Celebrated across all of India — culminating in Dussehra on the tenth day. Represents the triumph of the divine feminine over evil.",
    activities: ["Fast for 9 days or select days", "Worship each of the nine forms of Durga daily", "Perform Garba and Dandiya (Gujarat)", "Read Devi Mahatmyam (Chandi Path)", "Set up Kolu (dolls display) in South India"],
    deity: "Durga / Navadurga",
  },
  {
    name: "Dussehra (Vijayadashami)",
    date: "2026-10-19",
    month: "October",
    type: "Victory Festival",
    significance: "The tenth day after Navratri — Vijayadashami. Commemorates Rama's victory over Ravana and Durga's slaying of Mahishasura. The day of victory of good over evil, truth over falsehood.",
    activities: ["Burn effigies of Ravana, Kumbhakarna, Meghnad", "Perform Ayudha Puja (worship of tools)", "Begin new ventures, studies, or weapons training", "Watch Ramleela performances", "Exchange Shami leaves as gold"],
    deity: "Rama / Durga",
  },
  {
    name: "Dhanteras",
    date: "2026-10-28",
    month: "October",
    type: "Prosperity Festival",
    significance: "The first day of the Diwali festival — the 13th day of the dark fortnight of Kartika. The day of Dhanvantari (god of medicine and wealth). Auspicious for purchasing gold, silver, and new utensils.",
    activities: ["Purchase gold, silver, or new vessels", "Worship Goddess Lakshmi and Kubera", "Light lamps at dusk", "Clean and decorate the home", "Prepare sweets for Diwali"],
    deity: "Dhanvantari / Lakshmi",
  },
  {
    name: "Diwali",
    date: "2026-10-30",
    month: "October",
    type: "Major Festival",
    significance: "The festival of lights — the darkest night of the year (Amavasya of Kartika) lit up with thousands of lamps to welcome Goddess Lakshmi and celebrate the return of Rama to Ayodhya. India's most widely celebrated festival.",
    activities: ["Light diyas (oil lamps) and decorate with rangoli", "Perform Lakshmi puja at night", "Burst firecrackers (traditional, though now mindful)", "Exchange sweets and gifts with family", "Wear new clothes"],
    deity: "Lakshmi / Rama",
  },
  {
    name: "Kartik Purnima",
    date: "2026-11-13",
    month: "November",
    type: "Sacred Full Moon",
    significance: "The full moon of Kartika — one of the holiest full moons in the year. The day Shiva killed the demon Tripurasura (Tripurari Purnima). Also marks the end of the Kartika month bathing observance.",
    activities: ["Take a holy bath in rivers (especially Pushkar, Varanasi)", "Light 1000 lamps in temples", "Float lamp-boats on rivers", "Perform Vishnu puja", "Visit Pushkar fair"],
    deity: "Shiva / Vishnu",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_ORDER = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDisplayDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function daysFromNow(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  "Major Festival":      { bg: "#fef3c7", color: "#92400e" },
  "Solar Festival":      { bg: "#fef9c3", color: "#854d0e" },
  "Seasonal Festival":   { bg: "#dcfce7", color: "#166534" },
  "New Year Festival":   { bg: "#dbeafe", color: "#1e40af" },
  "Birth Festival":      { bg: "#ede9fe", color: "#5b21b6" },
  "Auspicious Day":      { bg: "#e0f2f4", color: "#005f73" },
  "Sacred Full Moon":    { bg: "#f0fdf4", color: "#15803d" },
  "Nature Festival":     { bg: "#ecfdf5", color: "#065f46" },
  "Family Festival":     { bg: "#fdf4ff", color: "#7e22ce" },
  "Victory Festival":    { bg: "#fff7ed", color: "#c2410c" },
  "Prosperity Festival": { bg: "#fef3c7", color: "#d97706" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FestivalsPage() {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [expandedFestival, setExpandedFestival] = useState<string | null>(null);

  const months = useMemo(() => {
    const present = new Set(FESTIVALS.map((f) => f.month));
    return ["All", ...MONTHS_ORDER.filter((m) => present.has(m))];
  }, []);

  const filtered = useMemo(() => {
    return FESTIVALS.filter((f) => {
      const matchesSearch = search === "" ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.significance.toLowerCase().includes(search.toLowerCase()) ||
        (f.deity?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesMonth = selectedMonth === "All" || f.month === selectedMonth;
      return matchesSearch && matchesMonth;
    });
  }, [search, selectedMonth]);

  const byMonth = useMemo(() => {
    const grouped: Record<string, Festival[]> = {};
    for (const f of filtered) {
      if (!grouped[f.month]) grouped[f.month] = [];
      grouped[f.month].push(f);
    }
    return grouped;
  }, [filtered]);

  const orderedMonths = MONTHS_ORDER.filter((m) => byMonth[m]);

  const nextFestival = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return FESTIVALS
      .filter((f) => new Date(f.date + "T00:00:00") >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  }, []);

  return (
    <main>
      <section className="feature-stage">
        <div className="feature-stage-grid">
          <div className="feature-stage-copy">
            <span className="feature-stage-kicker">Hindu Festival Calendar 2025–2026</span>
            <h1 className="feature-stage-title">Celebrate every sacred moment of the Hindu calendar year.</h1>
            <p className="feature-stage-summary">
              From Makar Sankranti to Kartik Purnima — every major Hindu festival with dates, significance,
              associated deities, and the traditional auspicious activities for each day.
            </p>
            <div className="feature-stage-step-list">
              <div className="feature-stage-step">
                <strong>1.</strong>
                <span>Browse all major festivals organized by month.</span>
              </div>
              <div className="feature-stage-step">
                <strong>2.</strong>
                <span>Search by festival name, deity, or theme to find what you are looking for.</span>
              </div>
              <div className="feature-stage-step">
                <strong>3.</strong>
                <span>Use the Panchang for the precise muhurta (auspicious timing) within any festival day.</span>
              </div>
            </div>
          </div>

          <div className="feature-stage-panel">
            {nextFestival && (
              <div style={{ background: "linear-gradient(135deg, #004d5d, #0a9396)", borderRadius: 14, padding: "20px 22px", color: "#fff" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75, marginBottom: 8 }}>
                  Coming up next
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: 4 }}>{nextFestival.name}</div>
                <div style={{ fontSize: "0.88rem", opacity: 0.85, marginBottom: 8 }}>{formatDisplayDate(nextFestival.date)}</div>
                <div
                  style={{
                    display: "inline-block", background: "rgba(255,255,255,0.18)",
                    borderRadius: 99, padding: "3px 12px", fontSize: "0.8rem", fontWeight: 700,
                  }}
                >
                  {daysFromNow(nextFestival.date) === 0
                    ? "Today!"
                    : daysFromNow(nextFestival.date) === 1
                    ? "Tomorrow"
                    : `In ${daysFromNow(nextFestival.date)} days`}
                </div>
                <div style={{ marginTop: 12, fontSize: "0.82rem", opacity: 0.8, lineHeight: 1.6 }}>
                  {nextFestival.significance.slice(0, 120)}…
                </div>
                {nextFestival.deity && (
                  <div style={{ marginTop: 8, fontSize: "0.78rem", opacity: 0.7 }}>
                    Deity: {nextFestival.deity}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link
                href="/panchang"
                style={{ fontSize: "0.85rem", fontWeight: 600, color: "#005f73", textDecoration: "none", padding: "6px 14px", borderRadius: 8, background: "#e0f2f4", display: "inline-block" }}
              >
                Today's Panchang →
              </Link>
              <Link
                href="/muhurta"
                style={{ fontSize: "0.85rem", fontWeight: 600, color: "#005f73", textDecoration: "none", padding: "6px 14px", borderRadius: 8, background: "#e0f2f4", display: "inline-block" }}
              >
                Find Muhurta →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div style={{ marginBottom: 16 }}>
        <Surface title="Browse & Filter">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 220px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Search</label>
              <input
                type="text"
                placeholder="Festival name, deity, or theme…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px",
                  fontSize: 14, background: "#fff", color: "#0f172a", width: "100%", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: "0 0 auto" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Month</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {months.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonth(m)}
                    style={{
                      padding: "6px 14px", borderRadius: 99, fontSize: "0.82rem", fontWeight: 600,
                      border: "1.5px solid",
                      borderColor: selectedMonth === m ? "#0a9396" : "#e2e8f0",
                      background: selectedMonth === m ? "#0a9396" : "#fff",
                      color: selectedMonth === m ? "#fff" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: "0.8rem", color: "#94a3b8" }}>
            Showing {filtered.length} of {FESTIVALS.length} festivals
          </div>
        </Surface>
      </div>

      {/* Festival cards by month */}
      {orderedMonths.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
          No festivals found for your search. Try a different name or clear the filters.
        </div>
      ) : (
        orderedMonths.map((month) => (
          <div key={month} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "#0a9396", marginBottom: 10, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ height: 1.5, width: 28, background: "#0a9396", display: "inline-block", borderRadius: 2 }} />
              {month}
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {byMonth[month].map((festival) => {
                const isExpanded = expandedFestival === festival.name;
                const typeColor = TYPE_COLORS[festival.type] ?? { bg: "#f1f5f9", color: "#475569" };
                const days = daysFromNow(festival.date);
                const isToday = days === 0;
                const isPast = days < 0;

                return (
                  <div
                    key={festival.name}
                    style={{
                      border: `1.5px solid ${isToday ? "#0a9396" : "#e2e8f0"}`,
                      borderRadius: 14, overflow: "hidden",
                      boxShadow: isToday ? "0 0 0 3px #0a939622" : "none",
                      opacity: isPast ? 0.65 : 1,
                    }}
                  >
                    {/* Card header */}
                    <button
                      type="button"
                      onClick={() => setExpandedFestival(isExpanded ? null : festival.name)}
                      style={{
                        width: "100%", textAlign: "left", background: isToday ? "#e0f2f4" : "#fff",
                        border: "none", cursor: "pointer", padding: "14px 16px",
                        display: "flex", alignItems: "flex-start", gap: 14,
                      }}
                    >
                      {/* Date badge */}
                      <div style={{
                        flexShrink: 0, width: 52, textAlign: "center",
                        background: isPast ? "#f1f5f9" : "linear-gradient(135deg, #005f73, #0a9396)",
                        borderRadius: 10, padding: "6px 0", color: isPast ? "#94a3b8" : "#fff",
                      }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, lineHeight: 1 }}>
                          {new Date(festival.date + "T00:00:00").getDate()}
                        </div>
                        <div style={{ fontSize: "0.68rem", fontWeight: 600, opacity: 0.85 }}>
                          {new Date(festival.date + "T00:00:00").toLocaleDateString("en-IN", { month: "short" })}
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.98rem", color: "#0f172a" }}>{festival.name}</span>
                          {isToday && (
                            <span style={{ fontSize: "0.7rem", fontWeight: 800, background: "#0a9396", color: "#fff", padding: "2px 8px", borderRadius: 99 }}>
                              TODAY
                            </span>
                          )}
                          {!isPast && !isToday && days <= 7 && (
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 99 }}>
                              In {days} day{days !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
                          <span style={{
                            fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                            background: typeColor.bg, color: typeColor.color,
                          }}>
                            {festival.type}
                          </span>
                          {festival.deity && (
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {festival.deity}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.84rem", color: "#475569", lineHeight: 1.5 }}>
                          {new Date(festival.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </div>
                      </div>

                      <span style={{ fontSize: "0.85rem", color: "#94a3b8", flexShrink: 0, marginTop: 2 }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "16px" }}>
                        <div style={{ fontSize: "0.88rem", color: "#334155", lineHeight: 1.8, marginBottom: 14 }}>
                          {festival.significance}
                        </div>

                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0a9396", marginBottom: 6 }}>
                            Auspicious Activities
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 6 }}>
                            {festival.activities.map((act, i) => (
                              <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: "0.84rem", color: "#334155", lineHeight: 1.5 }}>
                                <span style={{ color: "#0a9396", fontWeight: 700, flexShrink: 0 }}>•</span>
                                <span>{act}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Link
                            href={`/panchang?date=${festival.date}`}
                            style={{ fontSize: "0.8rem", fontWeight: 600, color: "#005f73", textDecoration: "none", padding: "5px 12px", borderRadius: 8, background: "#e0f2f4" }}
                          >
                            View Panchang for this day →
                          </Link>
                          <Link
                            href={`/muhurta?date_from=${festival.date}&date_to=${festival.date}`}
                            style={{ fontSize: "0.8rem", fontWeight: 600, color: "#005f73", textDecoration: "none", padding: "5px 12px", borderRadius: 8, background: "#e0f2f4" }}
                          >
                            Find Muhurta →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <Link href="/" style={{ color: "#64748b", fontSize: "0.88rem", textDecoration: "none" }}>
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
