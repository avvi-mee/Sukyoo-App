'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';

type Result = { error?: string; notice?: string };

const STATUSES = ['open', 'waiting_on_user', 'resolved', 'closed'] as const;

function friendly(message: string) {
  return message.includes('row-level security') || message.includes('not authorized')
    ? 'You do not have permission to do that.'
    : message;
}

export async function reply(
  ticketId: string,
  body: string,
  isInternal: boolean
): Promise<Result> {
  const staff = await requirePermission('support.manage');
  if (body.trim().length < 2) return { error: 'Write something first.' };

  const supabase = await createClient();
  const { error } = await supabase.from('support_messages').insert({
    ticket_id: ticketId,
    author_id: staff.userId,
    body: body.trim(),
    is_internal: isInternal,
  });
  if (error) return { error: friendly(error.message) };

  // Replying to the user moves the ticket to waiting-on-them; an internal note
  // does not, because nobody outside the team has been asked anything.
  if (!isInternal) {
    await supabase
      .from('support_tickets')
      .update({ status: 'waiting_on_user', updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .eq('status', 'open');
  }

  revalidatePath('/support');
  return { notice: isInternal ? 'Internal note added — the user cannot see it.' : 'Reply sent.' };
}

export async function setTicketStatus(ticketId: string, status: string): Promise<Result> {
  await requirePermission('support.manage');
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { error: 'Unknown status.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('support_tickets')
    .update({
      status,
      resolved_at: ['resolved', 'closed'].includes(status) ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);
  if (error) return { error: friendly(error.message) };

  revalidatePath('/support');
  return { notice: `Marked ${status.replace(/_/g, ' ')}.` };
}

export async function assignToMe(ticketId: string): Promise<Result> {
  const staff = await requirePermission('support.manage');

  const supabase = await createClient();
  const { error } = await supabase
    .from('support_tickets')
    .update({ assigned_to: staff.userId, updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  if (error) return { error: friendly(error.message) };

  revalidatePath('/support');
  return { notice: 'Assigned to you.' };
}

export async function setPriority(ticketId: string, priority: string): Promise<Result> {
  await requirePermission('support.manage');
  if (!['low', 'normal', 'urgent'].includes(priority)) return { error: 'Unknown priority.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('support_tickets')
    .update({ priority, updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  if (error) return { error: friendly(error.message) };

  revalidatePath('/support');
  return { notice: `Priority set to ${priority}.` };
}
