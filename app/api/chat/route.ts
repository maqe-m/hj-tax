import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Anthropic from '@anthropic-ai/sdk';
import { getCurrentUser } from '@/lib/auth/session';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionId, companyId, message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get or create session
    let currentSessionId = sessionId;

    if (!currentSessionId) {
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      const sessionResult = await sql`
        INSERT INTO chat_sessions (user_id, company_id, title)
        VALUES (${user.id}, ${companyId || null}, ${title})
        RETURNING id
      `;
      currentSessionId = sessionResult.rows[0].id;
    }

    // Save user message
    await sql`
      INSERT INTO chat_messages (session_id, role, content)
      VALUES (${currentSessionId}, 'user', ${message})
    `;

    // Update session timestamp
    await sql`
      UPDATE chat_sessions SET updated_at = NOW() WHERE id = ${currentSessionId}
    `;

    // Load company context if available
    let company: { name: string; bin: string; tax_regime: string; vat_payer: boolean } | null = null;
    if (companyId) {
      const companyResult = await sql`
        SELECT name, bin, tax_regime, vat_payer FROM companies
        WHERE id = ${companyId} AND owner_user_id = ${user.id}
      `;
      if (companyResult.rows.length > 0) {
        const row = companyResult.rows[0];
        company = {
          name: row.name,
          bin: row.bin,
          tax_regime: row.tax_regime,
          vat_payer: row.vat_payer,
        };
      }
    }

    // Build system prompt with relevant tax code sections
    const systemPrompt = buildSystemPrompt(message, company);

    // Load conversation history (last 20 messages)
    const historyResult = await sql`
      SELECT role, content FROM chat_messages
      WHERE session_id = ${currentSessionId}
      ORDER BY created_at ASC
      LIMIT 20
    `;

    const messages = historyResult.rows.map((row) => ({
      role: row.role as 'user' | 'assistant',
      content: row.content,
    }));

    // Stream response from Anthropic
    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text, sessionId: currentSessionId })}\n\n`
                )
              );
            }
          }

          // Save assistant message after stream completes
          await sql`
            INSERT INTO chat_messages (session_id, role, content)
            VALUES (${currentSessionId}, 'assistant', ${fullResponse})
          `;

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, sessionId: currentSessionId })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Stream error' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
