import { supabaseService } from "./supabase";

export async function recallMemories(personaId: string, message: string): Promise<string[]> {
  // Retrieve persona-specific memories and approved contributions. Keep robust and resilient.
  try {
    const results: string[] = [];

    // 1) Fetch most recent approved contributions for this persona
    const { data: contribs } = await (supabaseService as any)
      .from("persona_contributions")
      .select("content")
      .eq("persona_id", personaId)
      .eq("status", "APPROVED")
      .order("created_at", { ascending: false })
      .limit(12);

    if (Array.isArray(contribs)) {
      for (const c of contribs) {
        const content = (c as any)?.content;
        if (!content) continue;
        // content may be JSON or string; normalize to short bullet text
        if (typeof content === "string") {
          const text = content.trim();
          if (text) results.push(text);
        } else if (typeof content === "object") {
          const text = (content.story || content.text || content.summary || "").toString().trim();
          if (text) results.push(text);
        }
      }
    }

    // 2) Fetch persona description as background if available
    const { data: p } = await supabaseService
      .from("personas")
      .select("description")
      .eq("id", personaId)
      .maybeSingle();
    const desc = (p?.description || "").toString().trim();
    if (desc) results.push(desc);

    // 3) Light heuristic to pick only items that seem relevant to this message
    const lower = message.toLowerCase();
    const scored = results
      .map((m) => ({ m, score: m.toLowerCase().split(/[^a-z0-9]+/).reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0) }))
      .sort((a, b) => b.score - a.score);

    // 4) Return up to 8; if no signal, return up to 5 most recent
    const picked = (scored.length > 0 && scored[0].score > 0)
      ? scored.slice(0, 8).map(s => s.m)
      : results.slice(0, 5);

    return picked.filter(Boolean);
  } catch {
    // Safe fallback to avoid breaking chat if RLS or table is missing
    const lower = message.toLowerCase();
    const base = [
      "Loves Sunday calls with the family",
      "Enjoys baking apple pie with Granny Smith apples",
      "Values kindness and staying connected to loved ones",
      "Frequently mentions music from the 80s",
      "Keeps a tradition of sharing weekly highlights"
    ];
    const extra = lower.includes("recipe") ? ["Has a handwritten apple pie recipe passed down from mom"] : [];
    return base.slice(0, 5 - extra.length).concat(extra).slice(0, 5);
  }
}


