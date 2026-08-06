import { ensureKnowledgeSchema, getConfiguredModel, getOpenAiApiKey, getOrCreateVectorStore, openAiRequest, readSetting } from "../../../lib/knowledge";

export const runtime = "edge";

type ResponseOutput = {
  type?: string;
  content?: Array<{ type?: string; text?: string; annotations?: Array<{ type?: string; filename?: string }> }>;
};

type ConversationMessage = {
  role?: "user" | "assistant";
  text?: string;
};

function extractAnswer(output: ResponseOutput[]) {
  return output.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("\n").trim();
}

function extractSources(output: ResponseOutput[]) {
  const names = output.flatMap((item) => item.content ?? []).flatMap((item) => item.annotations ?? []).filter((annotation) => annotation.type === "file_citation" && annotation.filename).map((annotation) => annotation.filename as string);
  return [...new Set(names)];
}

export async function POST(request: Request) {
  try {
    const apiKey = getOpenAiApiKey(request);
    if (!apiKey) return Response.json({ error: "Pro test nejdřív zadej jednorázový OpenAI API klíč v knihovně." }, { status: 503 });
    const body = await request.json() as { question?: string; imageDataUrl?: string; messages?: ConversationMessage[] };
    const question = body.question?.trim();
    if (!question) return Response.json({ error: "Napiš otázku pro servisního asistenta." }, { status: 400 });
    if (question.length > 4000) return Response.json({ error: "Otázka je příliš dlouhá." }, { status: 400 });
    if (body.imageDataUrl && (!body.imageDataUrl.startsWith("data:image/") || body.imageDataUrl.length > 8_000_000)) return Response.json({ error: "Přiložená fotka musí být obrázek do 6 MB." }, { status: 400 });

    const conversation = (Array.isArray(body.messages) ? body.messages : []).filter((message): message is Required<ConversationMessage> => (message.role === "user" || message.role === "assistant") && typeof message.text === "string" && message.text.trim().length > 0).slice(-12).map((message) => ({ role: message.role, text: message.text.trim().slice(0, 4000) }));
    if (conversation.length === 0) conversation.push({ role: "user", text: question });
    if (conversation[conversation.length - 1].role !== "user") conversation.push({ role: "user", text: question });
    if (conversation.reduce((total, message) => total + message.text.length, 0) > 18_000) return Response.json({ error: "Rozhovor je příliš dlouhý. Založ prosím nový rozhovor." }, { status: 400 });

    await ensureKnowledgeSchema();
    const existingStore = await readSetting("openai_vector_store_id");
    if (!existingStore) return Response.json({ error: "Nejdřív nahraj alespoň jeden servisní podklad do knihovny." }, { status: 409 });
    const vectorStoreId = await getOrCreateVectorStore(apiKey);
    const input = conversation.map((message, index) => {
      const content: Array<Record<string, string>> = [{ type: "input_text", text: message.text }];
      if (body.imageDataUrl && index === conversation.length - 1 && message.role === "user") content.push({ type: "input_image", image_url: body.imageDataUrl });
      return { role: message.role, content };
    });

    const result = await openAiRequest<{ output?: ResponseOutput[] }>("/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getConfiguredModel(),
        instructions: "Jsi servisní asistent pro tým Barnet & synové. Veď krátký diagnostický rozhovor v češtině. Nejdřív z poskytnutého popisu vyhodnoť, zda máš dost informací pro bezpečný, modelově konkrétní návrh. Pokud něco podstatného chybí, NEDÁVEJ ještě postup opravy ani nehádej příčinu. Stručně napiš, co zatím víš, a polož nejvýše čtyři přesné otázky. Doptávej se jen na informace, které v rozhovoru nejsou: zejména značka a přesný model stroje, ročník nebo VIN pokud je potřeba, konkrétní projevy a kdy vznikají, chybové kódy či kontrolky a co už bylo změřeno nebo opravováno. Když jsou informace dostačující, navrhni postup krok za krokem pouze z nahrané servisní knihovny a z přiložené fotky. Uživatelský popis ber jako popis případu, nikoli jako ověřený technický fakt. Nevymýšlej konkrétní hodnoty ani postupy. Pokud knihovna nestačí, řekni to otevřeně a vyžádej si potřebný podklad nebo navrhni bezpečný další diagnostický krok. Technický závěr vždy stručně podlož použitými zdroji. Pokud dotaz porovnává českou a anglickou verzi, odpověz ve zvláštních blocích „České znění“, „Anglické znění“ a „Rozdíl“; jejich obsah nikdy nespojuj ani nevydávej za doslovnou citaci, pokud jej podklad výslovně neuvádí. Nikdy nenavrhuj obcházení bezpečnostních systémů stroje.",
        input,
        tools: [{ type: "file_search", vector_store_ids: [vectorStoreId], max_num_results: 5 }],
        include: ["file_search_call.results"],
        max_output_tokens: 700,
      }),
    }, apiKey);

    const output = result.output ?? [];
    return Response.json({ answer: extractAnswer(output) || "V nahrané knihovně jsem zatím nenašel dost podkladů pro bezpečnou odpověď.", sources: extractSources(output) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Asistent teď není dostupný." }, { status: 500 });
  }
}
