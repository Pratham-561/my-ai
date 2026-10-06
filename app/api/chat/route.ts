import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    return Response.json({
      reply:
        completion.choices[0]?.message?.content ||
        "No response received.",
    });
  } catch (error) {
    console.error("GROQ ERROR:", error);

    return Response.json(
      {
        error: String(error),
      },
      { status: 500 }
    );
  }
}