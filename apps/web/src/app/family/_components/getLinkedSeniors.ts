import { createClient } from '@/lib/supabase/server';

export type LinkedSenior = {
  id: string; // family_links.id
  seniorId: string;
  fullName: string | null;
  phone: string | null;
  relationshipType: string | null;
};

export async function getLinkedSeniors(familyMemberId: string): Promise<LinkedSenior[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('family_links')
    .select('id, senior_id, relationship_type, senior:profiles!family_links_senior_id_fkey(full_name, phone)')
    .eq('family_member_id', familyMemberId)
    .eq('status', 'active');

  return (data ?? []).map((row) => ({
    id: row.id,
    seniorId: row.senior_id,
    fullName: row.senior?.full_name ?? null,
    phone: row.senior?.phone ?? null,
    relationshipType: row.relationship_type,
  }));
}
