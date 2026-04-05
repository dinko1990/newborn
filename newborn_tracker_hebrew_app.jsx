import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Upload, Download, Plus, Trash2, MoonStar, Milk, Baby, AlertTriangle, Clock3 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

/**
 * MVP for a Hebrew newborn tracking website.
 *
 * STEP 1 - WhatsApp -> JSON (server/GPT side, described for integration)
 * ---------------------------------------------------------------
 * Expected event schema:
 * {
 *   id: string,
 *   type: "feeding" | "poop" | "sleep" | "exception",
 *   subtype?: string,
 *   startAt: ISO string,
 *   endAt?: ISO string,
 *   amountMl?: number,
 *   note?: string,
 *   source?: "manual" | "whatsapp_gpt",
 *   meta?: {
 *     rawText?: string,
 *     confidence?: number
 *   }
 * }
 *
 * Suggested GPT pipeline input:
 * {
 *   pastEvents: Event[],
 *   whatsappImages: ["base64-or-file-refs"],
 *   timezone: "Asia/Jerusalem",
 *   mapping: {
 *     feeding: ["סיימנו לאכול", "החלפת חיתול", "חיתול", "אוכל"],
 *     poop: ["קקי", "ציצי", "יציאה"],
 *     sleep: ["נרדמה", "ישנה", "התעוררה"],
 *     exception: ["אזעקה", "צבע אדום", "סיבוב", "מלחמה"]
 *   }
 * }
 *
 * Suggested GPT pipeline output:
 * {
 *   events: Event[],
 *   validationWarnings: string[]
 * }
 */

const initialDemoEvents = [
  {
    id: "1",
    type: "feeding",
    subtype: "formula",
    startAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    endAt: new Date(Date.now() - 1000 * 60 * 60 * 17 - 1000 * 60 * 25).toISOString(),
    note: "סיימה לאכול",
    source: "whatsapp_gpt",
  },
  {
    id: "2",
    type: "poop",
    startAt: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
    note: "קקי",
    source: "whatsapp_gpt",
  },
  {
    id: "3",
    type: "sleep",
    startAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    endAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    note: "שינה",
    source: "whatsapp_gpt",
  },
  {
    id: "4",
    type: "exception",
    subtype: "alarm",
    startAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    note: "אזעקת צבע אדום",
    source: "whatsapp_gpt",
  },
  {
    id: "5",
    type: "feeding",
    subtype: "breastfeeding",
    startAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    endAt: new Date(Date.now() - 1000 * 60 * 60 * 4 - 1000 * 60 * 35).toISOString(),
    note: "קקי ופיפי",
    source: "manual",
  },
  {
    id: "6",
    type: "poop",
    startAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    note: "קקי ופיפי",
    source: "manual",
  },
];

const typeLabels = {
  feeding: "אוכל",
  poop: "קקי / חיתול",
  sleep: "שינה",
  exception: "אירוע חריג",
};

const typeColors = {
  feeding: "bg-rose-100 hover:bg-rose-200 text-rose-900",
  poop: "bg-amber-100 hover:bg-amber-200 text-amber-900",
  sleep: "bg-sky-100 hover:bg-sky-200 text-sky-900",
  exception: "bg-violet-100 hover:bg-violet-200 text-violet-900",
};

const typeBadges = {
  feeding: "bg-rose-50 text-rose-800 border-rose-200",
  poop: "bg-amber-50 text-amber-800 border-amber-200",
  sleep: "bg-sky-50 text-sky-800 border-sky-200",
  exception: "bg-violet-50 text-violet-800 border-violet-200",
};

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHour(value) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationMinutes(startAt, endAt) {
  if (!startAt || !endAt) return null;
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

function dayKey(value) {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function SummaryCard({ title, value, icon }) {
  return (
    <Card className="rounded-2xl shadow-sm border-0">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <div className="text-slate-400">{icon}</div>
      </CardContent>
    </Card>
  );
}

export default function NewbornTrackerHebrewApp() {
  const fileInputRef = useRef(null);
  const [events, setEvents] = useState(initialDemoEvents);
  const [jsonText, setJsonText] = useState(JSON.stringify({ events: initialDemoEvents }, null, 2));
  const [dragOver, setDragOver] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [draft, setDraft] = useState({
    type: "feeding",
    subtype: "",
    startAt: new Date().toISOString().slice(0, 16),
    endAt: "",
    amountMl: "",
    note: "",
  });

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
  }, [events]);

  const stats = useMemo(() => {
    const now = Date.now();
    const last24h = events.filter((e) => new Date(e.startAt).getTime() >= now - 24 * 60 * 60 * 1000);
    const feedingCount = last24h.filter((e) => e.type === "feeding").length;
    const poopCount = last24h.filter((e) => e.type === "poop").length;
    const sleepMinutes = last24h
      .filter((e) => e.type === "sleep")
      .reduce((sum, e) => sum + (durationMinutes(e.startAt, e.endAt) || 0), 0);
    const exceptionCount = last24h.filter((e) => e.type === "exception").length;

    return { feedingCount, poopCount, sleepMinutes, exceptionCount };
  }, [events]);

  const chartData = useMemo(() => {
    const byDay = new Map();

    events.forEach((event) => {
      const key = dayKey(event.startAt);
      const current = byDay.get(key) || {
        date: new Date(key).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
        אוכל: 0,
        קקי: 0,
        שינה: 0,
        חריגים: 0,
      };

      if (event.type === "feeding") current["אוכל"] += 1;
      if (event.type === "poop") current["קקי"] += 1;
      if (event.type === "sleep") current["שינה"] += durationMinutes(event.startAt, event.endAt) || 0;
      if (event.type === "exception") current["חריגים"] += 1;

      byDay.set(key, current);
    });

    return [...byDay.entries()]
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([, value]) => value);
  }, [events]);

  const validationWarnings = useMemo(() => {
    const warnings = [];
    events.forEach((event) => {
      if (!event.type || !event.startAt) warnings.push(`אירוע חסר נתוני חובה: ${event.id}`);
      if (event.endAt && new Date(event.endAt) < new Date(event.startAt)) {
        warnings.push(`זמן סיום מוקדם מזמן התחלה: ${event.id}`);
      }
    });
    return warnings;
  }, [events]);

  function importJsonText(text) {
    try {
      const parsed = JSON.parse(text);
      const nextEvents = Array.isArray(parsed) ? parsed : parsed.events;
      if (!Array.isArray(nextEvents)) throw new Error("JSON חייב להכיל מערך events");
      setEvents(nextEvents);
      setJsonText(JSON.stringify({ events: nextEvents }, null, 2));
    } catch (err) {
      alert(`שגיאת JSON: ${err.message}`);
    }
  }

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => importJsonText(String(e.target?.result || ""));
    reader.readAsText(file, "utf-8");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ events }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newborn-events.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openQuickAdd(type) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setDraft({ type, subtype: "", startAt: local, endAt: "", amountMl: "", note: "" });
    setOpenAdd(true);
  }

  function saveDraft() {
    const newEvent = {
      id: uid(),
      type: draft.type,
      subtype: draft.subtype || undefined,
      startAt: new Date(draft.startAt).toISOString(),
      endAt: draft.endAt ? new Date(draft.endAt).toISOString() : undefined,
      amountMl: draft.amountMl ? Number(draft.amountMl) : undefined,
      note: draft.note || undefined,
      source: "manual",
    };
    const next = [newEvent, ...events];
    setEvents(next);
    setJsonText(JSON.stringify({ events: next }, null, 2));
    setOpenAdd(false);
  }

  function deleteEvent(id) {
    const next = events.filter((e) => e.id !== id);
    setEvents(next);
    setJsonText(JSON.stringify({ events: next }, null, 2));
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">מעקב יילוד</h1>
            <p className="text-slate-600 mt-2">
              מעקב פשוט בעברית אחרי אוכל, קקי, שינה ואירועים חריגים.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button className="rounded-2xl" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 ms-2" />
              טעינת JSON
            </Button>
            <Button className="rounded-2xl" variant="outline" onClick={exportJson}>
              <Download className="w-4 h-4 ms-2" />
              ייצוא JSON
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard title="האכלות ב-24 שעות" value={stats.feedingCount} icon={<Milk className="w-6 h-6" />} />
          <SummaryCard title="קקי / חיתולים ב-24 שעות" value={stats.poopCount} icon={<Baby className="w-6 h-6" />} />
          <SummaryCard title="דקות שינה ב-24 שעות" value={stats.sleepMinutes} icon={<MoonStar className="w-6 h-6" />} />
          <SummaryCard title="אירועים חריגים ב-24 שעות" value={stats.exceptionCount} icon={<AlertTriangle className="w-6 h-6" />} />
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="rounded-2xl">
            <TabsTrigger value="dashboard">דשבורד</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="flow">שלב 1: WhatsApp → JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2 rounded-3xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>גרף ספירה יומית</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="אוכל" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="קקי" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="חריגים" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>גרף דקות שינה</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="שינה" strokeWidth={3} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle>הוספת לוג</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button onClick={() => openQuickAdd("feeding")} className={`p-6 rounded-3xl text-lg font-semibold transition ${typeColors.feeding}`}>
                    <div className="flex flex-col items-center gap-2">
                      <Milk className="w-8 h-8" />
                      <span>אוכל</span>
                    </div>
                  </button>
                  <button onClick={() => openQuickAdd("poop")} className={`p-6 rounded-3xl text-lg font-semibold transition ${typeColors.poop}`}>
                    <div className="flex flex-col items-center gap-2">
                      <Baby className="w-8 h-8" />
                      <span>קקי / חיתול</span>
                    </div>
                  </button>
                  <button onClick={() => openQuickAdd("sleep")} className={`p-6 rounded-3xl text-lg font-semibold transition ${typeColors.sleep}`}>
                    <div className="flex flex-col items-center gap-2">
                      <MoonStar className="w-8 h-8" />
                      <span>שינה</span>
                    </div>
                  </button>
                  <button onClick={() => openQuickAdd("exception")} className={`p-6 rounded-3xl text-lg font-semibold transition ${typeColors.exception}`}>
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="w-8 h-8" />
                      <span>אירוע חריג</span>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle>ציר זמן</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedEvents.map((event) => (
                  <div key={event.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={typeBadges[event.type]}>{typeLabels[event.type]}</Badge>
                        {event.subtype ? <Badge variant="outline">{event.subtype}</Badge> : null}
                        <Badge variant="outline" className="text-slate-600">{event.source || "manual"}</Badge>
                      </div>
                      <div className="font-medium">{formatDateTime(event.startAt)}</div>
                      <div className="text-sm text-slate-600 flex gap-4 flex-wrap">
                        <span>התחלה: {formatHour(event.startAt)}</span>
                        <span>סיום: {formatHour(event.endAt)}</span>
                        {event.amountMl ? <span>{event.amountMl} מ״ל</span> : null}
                        {durationMinutes(event.startAt, event.endAt) ? (
                          <span className="inline-flex items-center gap-1"><Clock3 className="w-4 h-4" /> {durationMinutes(event.startAt, event.endAt)} דק׳</span>
                        ) : null}
                      </div>
                      {event.note ? <div className="text-sm text-slate-700">{event.note}</div> : null}
                    </div>
                    <Button variant="ghost" className="rounded-2xl self-start" onClick={() => deleteEvent(event.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle>טעינה ידנית של JSON</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFile(file);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  className={`rounded-3xl border-2 border-dashed p-8 text-center transition ${dragOver ? "border-slate-900 bg-slate-100" : "border-slate-300 bg-white"}`}
                >
                  גררו לכאן קובץ JSON או לחצו על "טעינת JSON"
                </div>

                <Textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="min-h-[360px] font-mono text-sm rounded-2xl"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button className="rounded-2xl" onClick={() => importJsonText(jsonText)}>עדכון מהטקסט</Button>
                  <Button className="rounded-2xl" variant="outline" onClick={() => setJsonText(JSON.stringify({ events }, null, 2))}>רענון מהנתונים</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle>בדיקות ולידציה</CardTitle>
              </CardHeader>
              <CardContent>
                {validationWarnings.length === 0 ? (
                  <div className="text-slate-600">אין שגיאות בסיסיות.</div>
                ) : (
                  <ul className="space-y-2 text-sm text-red-700">
                    {validationWarnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flow" className="space-y-4">
            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle>הגדרת שלב 1: המרת WhatsApp ל-JSON</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-slate-700">
                <div>
                  <div className="font-semibold text-slate-900">קלט ל-GPT</div>
                  <div>1. JSON של כל האירועים הקודמים</div>
                  <div>2. תמונות חדשות של צ׳אט WhatsApp</div>
                  <div>3. מיפוי מונחים לאירועים, עם אפשרות ולידציה</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">פלט מ-GPT</div>
                  <div>JSON מעודכן עם כל האירועים עד עכשיו, כולל warning אם יש ספק או כפילות.</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">דוגמת Prompt</div>
                  <Textarea
                    readOnly
                    className="min-h-[260px] rounded-2xl font-mono text-xs"
                    value={`המערכת מקבלת:
- pastEvents: JSON של כל האירועים הקודמים
- whatsappImages: תמונות של הודעות חדשות מהצ'אט
- timezone: Asia/Jerusalem
- mapping: מיפוי בין טקסטים לאירועים

המשימה:
1. לקרוא את התמונות ולחלץ רק אירועים חדשים.
2. לאחד עם pastEvents.
3. להחזיר events ממוינים לפי זמן.
4. כל אירוע צריך להיות בפורמט:
   { id, type, subtype?, startAt, endAt?, amountMl?, note?, source, meta? }
5. לזהות מילים כמו קקי, פיפי, החלפת חיתול, סיימנו לאכול, התחלנו עוד הנקה, צבע אדום, סיבוב.
6. אם אותו אירוע מופיע פעמיים, לאחד אותו.
7. אם השעה לא ודאית, להוסיף validationWarnings.

החזר JSON בלבד:
{
  "events": [...],
  "validationWarnings": []
}`}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent dir="rtl" className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>הוספת לוג חדש</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>סוג</Label>
              <select
                className="border rounded-2xl p-3 bg-white"
                value={draft.type}
                onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
              >
                <option value="feeding">אוכל</option>
                <option value="poop">קקי / חיתול</option>
                <option value="sleep">שינה</option>
                <option value="exception">אירוע חריג</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label>תת סוג</Label>
              <Input value={draft.subtype} onChange={(e) => setDraft((d) => ({ ...d, subtype: e.target.value }))} placeholder="למשל: breastfeeding / alarm" className="rounded-2xl" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>זמן התחלה</Label>
                <Input type="datetime-local" value={draft.startAt} onChange={(e) => setDraft((d) => ({ ...d, startAt: e.target.value }))} className="rounded-2xl" />
              </div>
              <div className="grid gap-2">
                <Label>זמן סיום</Label>
                <Input type="datetime-local" value={draft.endAt} onChange={(e) => setDraft((d) => ({ ...d, endAt: e.target.value }))} className="rounded-2xl" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>כמות במ״ל</Label>
              <Input type="number" value={draft.amountMl} onChange={(e) => setDraft((d) => ({ ...d, amountMl: e.target.value }))} className="rounded-2xl" />
            </div>

            <div className="grid gap-2">
              <Label>הערות</Label>
              <Textarea value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} className="rounded-2xl" />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => setOpenAdd(false)}>ביטול</Button>
            <Button className="rounded-2xl" onClick={saveDraft}>
              <Plus className="w-4 h-4 ms-2" />
              שמירה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
