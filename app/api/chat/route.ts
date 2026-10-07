export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3:8b",
        messages: messages,
        stream: true,
        think: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      return Response.json(
        {
          error: errorText || "Ollama request failed",
        },
        { status: response.status }
      );
    }

    if (!response.body) {
      return Response.json(
        {
          error: "No response stream received from Ollama.",
        },
        { status: 500 }
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "application/x-ndjson",
      },
    });
  } catch (error) {
    console.error("OLLAMA ERROR:", error);

    return Response.json(
      {
        error: String(error),
      },
      { status: 500 }
    );
  }
}