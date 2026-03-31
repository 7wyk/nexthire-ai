import { ChatGroq } from '@langchain/groq'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

const groq = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama3-8b-8192',   // Free tier – fast & capable
  temperature: 0.3,
})

/**
 * Screen a resume against a job description using Groq LLM.
 * Returns structured JSON with score, summary, strengths, weaknesses.
 */
export const screenResumeWithAI = async (resumeText, jobDescription) => {
  const systemPrompt = `You are an expert technical recruiter and hiring manager.
Your task is to evaluate a candidate's resume against a job description.
You MUST respond with ONLY valid JSON – no markdown, no explanation, just JSON.`

  const userPrompt = `
JOB DESCRIPTION:
${jobDescription.substring(0, 2000)}

RESUME:
${resumeText.substring(0, 3000)}

Evaluate the candidate and return this exact JSON structure:
{
  "score": <integer 0-100>,
  "summary": "<2-3 sentence overview of the candidate>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<gap 1>", "<gap 2>"],
  "skills": ["<extracted skill 1>", "<skill 2>", "..."],
  "experience": <estimated years as integer>,
  "recommendation": "<hire | interview | reject>",
  "reasoning": "<1 sentence explaining the score>"
}`

  const response = await groq.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ])

  const raw = response.content.trim()

  // Extract JSON even if model wraps it
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')

  return JSON.parse(jsonMatch[0])
}

/**
 * Generate adaptive interview questions based on resume & job.
 */
export const generateInterviewQuestions = async (resumeText, jobTitle, round = 1) => {
  const userPrompt = `
You are a senior technical interviewer at a top tech company.
Role: ${jobTitle}
Candidate resume summary: ${resumeText.substring(0, 1500)}
Interview round: ${round === 1 ? 'Technical screening' : 'Deep technical'}

Generate 5 targeted interview questions. Return ONLY valid JSON:
{
  "questions": [
    { "id": 1, "question": "...", "category": "<technical|behavioral|system-design>", "difficulty": "<easy|medium|hard>" },
    ...
  ]
}`

  const response = await groq.invoke([
    new SystemMessage('You are a senior technical interviewer. Return ONLY valid JSON.'),
    new HumanMessage(userPrompt),
  ])

  const raw = response.content.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')
  return JSON.parse(jsonMatch[0])
}

/**
 * Evaluate a code submission for quality, complexity, and edge cases.
 */
export const evaluateCode = async (code, problem, language) => {
  const userPrompt = `
Evaluate this ${language} code solution for the following problem:

PROBLEM: ${problem}

CODE:
\`\`\`${language}
${code}
\`\`\`

Return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "timeComplexity": "<O(n), O(n log n), etc.>",
  "spaceComplexity": "<O(1), O(n), etc.>",
  "codeQuality": "<poor|fair|good|excellent>",
  "feedback": "<detailed feedback>",
  "improvements": ["<suggestion 1>", "<suggestion 2>"],
  "correctness": <integer 0-100>,
  "edgeCaseHandling": <integer 0-100>
}`

  const response = await groq.invoke([
    new SystemMessage('You are a senior software engineer doing a code review. Return ONLY valid JSON.'),
    new HumanMessage(userPrompt),
  ])

  const raw = response.content.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')
  return JSON.parse(jsonMatch[0])
}
