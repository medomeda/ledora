import { SOURCE_ORDER } from "@/lib/constants/labels";
import { pct } from "@/lib/utils/percent";
import { requireBusiness, type Ctx } from "@/server/context";
import type { DbState } from "@/server/db/store";
import { requireQuiz } from "@/services/quiz.service";
import type { QuizSubmission, TrafficSource } from "@/types/domain";

/**
 * Statistiques (PRD §6.3, §6.8). Tout est calculé à partir des événements réellement enregistrés (visites, participations).
 *
 * Définitions — deux taux distincts :
 *  - Taux de complétion  = participations terminées / participations commencées.
 *  - Taux de conversion  = participations ayant transmis leurs coordonnées / visiteurs (sessions uniques) ; à défaut
 *    de visites enregistrées, le dénominateur est le nombre de participations commencées.
 */
export interface Funnel {
  visits: number;
  started: number;
  completed: number;
  leads: number;
  completionRate: number;
  conversionRate: number;
}

export interface DayPoint {
  date: string; // yyyy-MM-dd
  visits: number;
  completed: number;
  leads: number;
}

const localDayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayKey = (iso: string) => localDayKey(new Date(iso));

function funnel(visits: number, subs: QuizSubmission[]): Funnel {
  const started = subs.length;
  const completed = subs.filter((x) => x.status === "completed").length;
  const leads = subs.filter((x) => x.leadId).length;
  return { visits, started, completed, leads, completionRate: pct(completed, started), conversionRate: pct(leads, visits > 0 ? visits : started) };
}

function series(days: number, now: Date, visits: Array<{ createdAt: string }>, subs: QuizSubmission[]): DayPoint[] {
  const points: DayPoint[] = [];
  const index = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const p = { date: localDayKey(d), visits: 0, completed: 0, leads: 0 };
    points.push(p);
    index.set(p.date, p);
  }
  for (const v of visits) {
    const p = index.get(dayKey(v.createdAt));
    if (p) p.visits += 1;
  }
  for (const x of subs) {
    const done = x.completedAt ? index.get(dayKey(x.completedAt)) : undefined;
    if (done) done.completed += 1;
    const lead = x.leadId ? index.get(dayKey(x.startedAt)) : undefined;
    if (lead) lead.leads += 1;
  }
  return points;
}

export interface QuizStats {
  funnel: Funnel;
  daily: DayPoint[];
  profiles: Array<{ name: string; count: number; percent: number }>;
  scores: Array<{ label: string; count: number }>;
  sources: Array<{ source: TrafficSource; count: number; percent: number }>;
  campaigns: Array<{ campaign: string; count: number }>;
  recent: Array<{ submissionId: string; leadId: string | null; name: string; email: string; profileName: string | null; score: number; maxScore: number; completedAt: string | null; startedAt: string }>;
}

export function getQuizStats(s: Readonly<DbState>, ctx: Ctx, quizId: string, days = 30, now = new Date()): QuizStats {
  const business = requireBusiness(s, ctx);
  const quiz = requireQuiz(s, business, quizId);
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).toISOString();
  const visits = s.quizVisits.filter((v) => v.quizId === quiz.id && v.createdAt >= since);
  const subs = s.quizSubmissions.filter((x) => x.quizId === quiz.id && x.startedAt >= since);
  const completed = subs.filter((x) => x.status === "completed");

  const byProfile = new Map<string, number>();
  for (const x of completed) if (x.profileName) byProfile.set(x.profileName, (byProfile.get(x.profileName) ?? 0) + 1);

  // Répartition des scores en tranches de 20 % du maximum.
  const buckets = [0, 0, 0, 0, 0];
  for (const x of completed) if (x.maxScore > 0) buckets[Math.min(4, Math.floor((x.totalScore / x.maxScore) * 5))]!++;
  const labels = ["0–20 %", "20–40 %", "40–60 %", "60–80 %", "80–100 %"];

  const sourceCount = new Map<TrafficSource, number>();
  for (const v of visits) sourceCount.set(v.source, (sourceCount.get(v.source) ?? 0) + 1);
  const campaigns = new Map<string, number>();
  for (const v of visits) if (v.utmCampaign) campaigns.set(v.utmCampaign, (campaigns.get(v.utmCampaign) ?? 0) + 1);

  const leadsById = new Map(s.leads.filter((l) => l.businessId === business.id).map((l) => [l.id, l]));
  return {
    funnel: funnel(visits.length, subs),
    daily: series(days, now, visits, subs),
    profiles: [...byProfile.entries()].map(([name, count]) => ({ name, count, percent: pct(count, completed.length) })).sort((a, b) => b.count - a.count),
    scores: labels.map((label, i) => ({ label, count: buckets[i]! })),
    sources: SOURCE_ORDER.map((source) => ({ source, count: sourceCount.get(source) ?? 0, percent: pct(sourceCount.get(source) ?? 0, visits.length) })).filter((x) => x.count > 0),
    campaigns: [...campaigns.entries()].map(([campaign, count]) => ({ campaign, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    recent: completed
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 8)
      .map((x) => {
        const lead = x.leadId ? leadsById.get(x.leadId) : undefined;
        return { submissionId: x.id, leadId: lead?.id ?? null, name: lead ? `${lead.firstName} ${lead.lastName}`.trim() : "Participant anonyme", email: lead?.email ?? "", profileName: x.profileName, score: x.totalScore, maxScore: x.maxScore, completedAt: x.completedAt, startedAt: x.startedAt };
      }),
  };
}

export interface DashboardData {
  kpis: {
    totalQuizzes: number;
    publishedQuizzes: number;
    participants: number;
    newLeads: number;
    totalLeads: number;
    qualifiedLeads: number;
    completionRate: number;
    conversionRate: number;
  };
  hasActivity: boolean;
  daily: DayPoint[];
  recentLeads: Array<{ id: string; name: string; email: string; profileName: string | null; quizTitle: string | null; createdAt: string }>;
  topQuizzes: Array<{ id: string; title: string; participants: number; leads: number; completionRate: number; conversionRate: number }>;
  activity: Array<{ id: string; kind: "lead" | "completion" | "published"; text: string; at: string }>;
}

export function getDashboard(s: Readonly<DbState>, ctx: Ctx, days = 30, now = new Date()): DashboardData {
  const business = requireBusiness(s, ctx);
  const quizzes = s.quizzes.filter((q) => q.businessId === business.id);
  const quizIds = new Set(quizzes.map((q) => q.id));
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).toISOString();
  const allSubs = s.quizSubmissions.filter((x) => quizIds.has(x.quizId));
  const subs = allSubs.filter((x) => x.startedAt >= since);
  const visits = s.quizVisits.filter((v) => quizIds.has(v.quizId) && v.createdAt >= since);
  const leads = s.leads.filter((l) => l.businessId === business.id);
  const f = funnel(visits.length, subs);

  const titleOf = (id: string) => quizzes.find((q) => q.id === id)?.config.title ?? null;
  const firstSub = (leadId: string) => allSubs.filter((x) => x.leadId === leadId).sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0];

  const recentLeads = [...leads]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map((l) => {
      const sub = firstSub(l.id);
      const latest = allSubs.filter((x) => x.leadId === l.id && x.status === "completed").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];
      return { id: l.id, name: `${l.firstName} ${l.lastName}`.trim(), email: l.email, profileName: latest?.profileName ?? null, quizTitle: sub ? titleOf(sub.quizId) : null, createdAt: l.createdAt };
    });

  const topQuizzes = quizzes
    .map((q) => {
      const qs = allSubs.filter((x) => x.quizId === q.id);
      const qv = s.quizVisits.filter((v) => v.quizId === q.id).length;
      const fn = funnel(qv, qs);
      return { id: q.id, title: q.config.title, participants: fn.completed, leads: fn.leads, completionRate: fn.completionRate, conversionRate: fn.conversionRate };
    })
    .filter((q) => q.participants > 0)
    .sort((a, b) => b.leads - a.leads || b.participants - a.participants)
    .slice(0, 4);

  const activity: DashboardData["activity"] = [];
  for (const l of recentLeads) activity.push({ id: `lead-${l.id}`, kind: "lead", text: `${l.name} a rejoint votre CRM${l.quizTitle ? ` via « ${l.quizTitle} »` : ""}`, at: l.createdAt });
  for (const q of quizzes) if (q.publishedAt) activity.push({ id: `pub-${q.id}`, kind: "published", text: `Quiz « ${q.config.title} » publié`, at: q.publishedAt });
  activity.sort((a, b) => b.at.localeCompare(a.at));

  return {
    kpis: {
      totalQuizzes: quizzes.filter((q) => q.status !== "archived").length,
      publishedQuizzes: quizzes.filter((q) => q.status === "published").length,
      participants: allSubs.filter((x) => x.status === "completed").length,
      newLeads: leads.filter((l) => l.createdAt >= since).length,
      totalLeads: leads.length,
      qualifiedLeads: leads.filter((l) => l.status === "qualified" || l.status === "converted").length,
      completionRate: f.completionRate,
      conversionRate: f.conversionRate,
    },
    hasActivity: allSubs.length > 0 || leads.length > 0,
    daily: series(days, now, visits, subs),
    recentLeads,
    topQuizzes,
    activity: activity.slice(0, 6),
  };
}
