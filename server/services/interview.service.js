import { ChatGroq } from '@langchain/groq'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'

const groq = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama3-8b-8192',
  temperature: 0.7,
})

/** System prompt builder for the AI interviewer */
const buildSystemPrompt = (jobTitle, resumeSummary) => `
You are Alex, a senior technical interviewer at a world-class tech company.
You are conducting a structured technical interview for the role of: ${jobTitle}.

Candidate background: ${resumeSummary || 'Not provided'}

Your interview style:
- Ask ONE focused question at a time
- Adapt follow-up questions based on candidate's answers
- Probe deeper on vague answers
- Cover: technical knowledge, problem-solving, system design, and behavioral aspects
- Be professional, encouraging, but rigorous
- If the candidate gives an excellent answer, acknowledge it briefly before moving on
- Keep responses concise (2-4 sentences max for questions)
- Never reveal the answer to your own questions

After 5-7 questions, you may wrap up with "Thank you for your time. I'll share my feedback with the team."
`.trim()

/** Generate the first interview question */
export const startInterview = async ({ jobTitle, resumeText, resumeSkills }) => {
  const resumeSummary = resumeSkills?.length > 0
    ? `Skills: ${resumeSkills.join(', ')}. ${resumeText?.substring(0, 300) || ''}`
    : resumeText?.substring(0, 300) || 'No resume provided'

  const response = await groq.invoke([
    new SystemMessage(buildSystemPrompt(jobTitle, resumeSummary)),
    new HumanMessage('Please start the interview with a warm welcome and your first question.'),
  ])

  return {
    role: 'interviewer',
    content: response.content,
    category: 'technical',
  }
}

/** Continue the interview given full message history */
export const continueInterview = async ({ jobTitle, resumeText, resumeSkills, messages, questionCount }) => {
  const resumeSummary = resumeSkills?.length > 0
    ? `Skills: ${resumeSkills.join(', ')}`
    : resumeText?.substring(0, 200) || 'Not provided'

  // Convert stored messages to LangChain format
  const history = messages.map(m =>
    m.role === 'interviewer'
      ? new AIMessage(m.content)
      : new HumanMessage(m.content)
  )

  // After 6+ questions, signal wrap-up
  const wrapUpHint = questionCount >= 6
    ? '\n\nNote: This is the final question. After the candidate answers, thank them and conclude the interview.'
    : ''

  const response = await groq.invoke([
    new SystemMessage(buildSystemPrompt(jobTitle, resumeSummary) + wrapUpHint),
    ...history,
  ])

  return {
    role: 'interviewer',
    content: response.content,
  }
}

/** Evaluate a single candidate answer */
export const evaluateAnswer = async ({ question, answer, jobTitle }) => {
  const prompt = `
Role: ${jobTitle}
Question asked: ${question}
Candidate answer: ${answer}

Evaluate this answer. Return ONLY valid JSON:
{
  "score": <integer 0-10>,
  "feedback": "<brief constructive feedback in 1-2 sentences>",
  "category": "<technical|behavioral|system-design|communication>",
  "strength": "<what they did well>",
  "improvement": "<what could be better>"
}`

  const response = await groq.invoke([
    new SystemMessage('You are a technical interview evaluator. Return ONLY valid JSON.'),
    new HumanMessage(prompt),
  ])

  const raw = response.content.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { score: 5, feedback: 'Answer evaluated.', category: 'technical' }
  return JSON.parse(jsonMatch[0])
}

/** Generate final interview summary after session ends */
export const generateInterviewSummary = async ({ jobTitle, messages }) => {
  const transcript = messages
    .map(m => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n')

  const prompt = `
Review this complete interview transcript for the role: ${jobTitle}

TRANSCRIPT:
${transcript.substring(0, 4000)}

Provide a comprehensive evaluation. Return ONLY valid JSON:
{
  "overall": <integer 0-100>,
  "technical": <integer 0-100>,
  "behavioral": <integer 0-100>,
  "communication": <integer 0-100>,
  "summary": "<2-3 sentence executive summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1>", "<concern 2>"],
  "recommendation": "<hire|interview-next|reject>",
  "reasoning": "<1 sentence justification>"
}`

  const response = await groq.invoke([
    new SystemMessage('You are a hiring committee expert. Return ONLY valid JSON.'),
    new HumanMessage(prompt),
  ])

  const raw = response.content.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')
  return JSON.parse(jsonMatch[0])
}
