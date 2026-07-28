import { ensureKnowledgeSchema, getConfiguredModel, getOpenAiApiKey, getOrCreateVectorStore, openAiRequest, readSetting } from "../../../lib/knowledge";

export const runtime = "edge";

type ResponseOutput = {
  type?: string;
  content?: Array<{ type?: string; text?: string; annotations?: Array<{ type?: string; filename?: string }> }>;
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
    const body = await request.json() as { question?: string; imageDataUrl?: string };
    const question = body.question?.trim();
    if (!question) return Response.json({ error: "Napiš otázku pro servisního asistenta." }, { status: 400 });
    if (question.length > 4000) return Response.json({ error: "Otázka je příliš dlouhá." }, { status: 400 });
    if (body.imageDataUrl && (!body.imageDataUrl.startsWith("data:image/") || body.imageDataUrl.length > 8_000_000)) return Response.json({ error: "Přiložená fotka musí být obrázek do 6 MB." }, { status: 400 });

    await ensureKnowledgeSchema();
    const existingStore = await readSetting("openai_vector_store_id");
    if (!existingStore) return Response.json({ error: "Nejdřív nahraj alespoň jeden servisní podklad do knihovny." }, { status: 409 });
    const vectorStoreId = await getOrCreateVectorStore(apiKey);
    const content: Array<Record<string, string>> = [{ type: "input_text", text: question }];
    if (body.imageDataUrl) content.push({ type: "input_image", image_url: body.imageDataUrl });

    const result = await openAiRequest<{ output?: ResponseOutput[] }>("/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getConfiguredModel(),
        instructions: "Jsi servisní asistent pro tým Barnet & synové. Odpovídej česky. Pracuj pouze s informacemi dohledanými v servisní knihovně a s fotkou, pokud je přiložena. Nevymýšlej konkrétní hodnoty ani postupy. Pokud podklad nestačí, řekni to otevřeně a navrhni bezpečný další diagnostický krok. Vždy stručně uveď zdroje, které odpověď podpořily. Nikdy nenavrhuj obcházení bezpečnostních systémů stroje.",
        input: [{ role: "user", content }],
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
