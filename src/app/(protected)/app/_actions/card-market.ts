"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Card Market — Share flashcard decks within your study party
// ---------------------------------------------------------------------------

export interface SharedDeck {
  id: string;
  creatorName: string;
  topicName: string;
  subjectName: string;
  cardCount: number;
  importCount: number;
  createdAt: string;
  alreadyImported: boolean;
}

export interface DeckCard {
  front: string;
  back: string;
}

export async function getPartyDecks(): Promise<{ decks: SharedDeck[]; partyName: string | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { decks: [], partyName: null, error: "Not authenticated" };

  // Find user's party
  const { data: membership } = await supabase
    .from("party_members")
    .select("party_id, parties(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { decks: [], partyName: null, error: "Join a party first to access the Card Market" };

  const partyName = (membership.parties as unknown as { name: string } | null)?.name ?? null;

  // Get all party members
  const { data: members } = await supabase
    .from("party_members")
    .select("user_id, profiles(display_name)")
    .eq("party_id", membership.party_id);

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  const nameMap = new Map<string, string>();
  (members ?? []).forEach((m) => {
    const name = (m.profiles as unknown as { display_name: string | null } | null)?.display_name ?? "Student";
    nameMap.set(m.user_id as string, name);
  });

  // Get topics with cards from party members (excluding self)
  const otherMembers = memberIds.filter((id) => id !== user.id);
  if (otherMembers.length === 0) return { decks: [], partyName, error: undefined };

  // Count cards per topic per member
  const { data: cards } = await supabase
    .from("cards")
    .select("user_id, topics(id, name, subjects(name))")
    .in("user_id", otherMembers);

  // Aggregate into "decks"
  const deckMap = new Map<string, { userId: string; topicId: string; topicName: string; subjectName: string; count: number }>();
  for (const card of cards ?? []) {
    const topic = card.topics as unknown as { id: string; name: string; subjects: { name: string } | null } | null;
    if (!topic) continue;
    const key = `${card.user_id}:${topic.id}`;
    const existing = deckMap.get(key);
    if (existing) { existing.count++; }
    else { deckMap.set(key, { userId: card.user_id as string, topicId: topic.id, topicName: topic.name, subjectName: topic.subjects?.name ?? "General", count: 1 }); }
  }

  // Filter: only show topics with 3+ cards
  const decks: SharedDeck[] = [...deckMap.values()]
    .filter((d) => d.count >= 3)
    .map((d) => ({
      id: `${d.userId}:${d.topicId}`,
      creatorName: nameMap.get(d.userId) ?? "Student",
      topicName: d.topicName,
      subjectName: d.subjectName,
      cardCount: d.count,
      importCount: 0,
      createdAt: new Date().toISOString(),
      alreadyImported: false, // simplified — would need import tracking table
    }))
    .sort((a, b) => b.cardCount - a.cardCount);

  return { decks, partyName };
}

export async function importDeck(creatorId: string, topicId: string): Promise<{ imported: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { imported: 0, error: "Not authenticated" };

  // Fetch the creator's cards for this topic
  const { data: sourceCards } = await supabase
    .from("cards")
    .select("front, back, source_type")
    .eq("user_id", creatorId)
    .eq("topic_id", topicId);

  if (!sourceCards || sourceCards.length === 0) return { imported: 0, error: "No cards found" };

  // Check if user has this topic, create if not
  const { data: existingTopic } = await supabase
    .from("topics")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", topicId)
    .maybeSingle();

  let targetTopicId = topicId;
  if (!existingTopic) {
    // Get topic info from source
    const { data: srcTopic } = await supabase
      .from("topics")
      .select("name, subject_id")
      .eq("id", topicId)
      .single();

    if (srcTopic) {
      const { data: newTopic } = await supabase
        .from("topics")
        .insert({ user_id: user.id, name: srcTopic.name, subject_id: srcTopic.subject_id })
        .select("id")
        .single();
      if (newTopic) targetTopicId = newTopic.id;
    }
  }

  // Import cards with fresh FSRS state
  const newCards = sourceCards.map((c) => ({
    user_id: user.id,
    topic_id: targetTopicId,
    front: c.front,
    back: c.back,
    source_type: "imported",
    state: 0, // New
    stability: null,
    difficulty: null,
    due: new Date().toISOString(),
    reps: 0,
    lapses: 0,
  }));

  const { error: insertError } = await supabase.from("cards").insert(newCards);
  if (insertError) return { imported: 0, error: insertError.message };

  revalidatePath("/app/review");
  return { imported: sourceCards.length };
}
