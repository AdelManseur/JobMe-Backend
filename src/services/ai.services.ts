import groq from "../lib/groq";

export async function AICHATBOT(message:string) {
  const completion = await groq.chat.completions.create({
    model: /*"meta-llama/llama-4-maverick-17b-128e-instruct"*/ "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: message,
      },
    ],
    n:1,
  });
  return(completion.choices[0]?.message?.content);
}
